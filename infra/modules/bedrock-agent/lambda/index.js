const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load feed database (fallback)
let feedDatabase = [];
try {
  const dbPath = path.join(__dirname, 'feed-database.json');
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  feedDatabase = JSON.parse(dbContent);
  console.log(`Loaded ${feedDatabase.length} feeds from database`);
} catch (error) {
  console.error('Failed to load feed database:', error);
}

/**
 * Validate if a URL is a valid RSS/Atom feed
 */
async function validateFeedUrl(url, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        method: 'HEAD',
        timeout: timeout,
        headers: {
          'User-Agent': 'FeedBower/1.0'
        }
      };
      
      const req = protocol.request(url, options, (res) => {
        const contentType = res.headers['content-type'] || '';
        const isValidFeed = 
          contentType.includes('xml') || 
          contentType.includes('rss') || 
          contentType.includes('atom') ||
          contentType.includes('application/rss+xml') ||
          contentType.includes('application/atom+xml') ||
          res.statusCode === 200; // Accept 200 even without content-type
        
        resolve({
          valid: isValidFeed && res.statusCode === 200,
          statusCode: res.statusCode,
          contentType: contentType
        });
      });
      
      req.on('error', () => {
        resolve({ valid: false, error: 'Request failed' });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ valid: false, error: 'Timeout' });
      });
      
      req.end();
    } catch (error) {
      resolve({ valid: false, error: error.message });
    }
  });
}

/**
 * Fetch and parse feed content to get title and description
 */
async function fetchFeedMetadata(url, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        method: 'GET',
        timeout: timeout,
        headers: {
          'User-Agent': 'FeedBower/1.0'
        }
      };
      
      const req = protocol.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
          // Limit data size to prevent memory issues
          if (data.length > 100000) {
            req.destroy();
          }
        });
        
        res.on('end', () => {
          try {
            // Simple XML parsing for title and description
            const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = data.match(/<description[^>]*>([^<]+)<\/description>/i);
            const subtitleMatch = data.match(/<subtitle[^>]*>([^<]+)<\/subtitle>/i);
            
            resolve({
              title: titleMatch ? titleMatch[1].trim() : 'Unknown Feed',
              description: (descMatch || subtitleMatch) ? (descMatch || subtitleMatch)[1].trim() : ''
            });
          } catch (error) {
            resolve({ title: 'Unknown Feed', description: '' });
          }
        });
      });
      
      req.on('error', () => {
        resolve({ title: 'Unknown Feed', description: '' });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ title: 'Unknown Feed', description: '' });
      });
      
      req.end();
    } catch (error) {
      resolve({ title: 'Unknown Feed', description: '' });
    }
  });
}

/**
 * Calculate relevance score for a feed based on keywords
 * Weights: Title (0.4), Description (0.3), Category (0.2), Tags (0.1)
 * Language penalty: 30% reduction if language doesn't match
 */
function calculateRelevance(feed, keywords, preferredLanguage) {
  let score = 0;
  const normalizedKeywords = keywords.map(kw => kw.toLowerCase());
  
  // Title match: 0.4 weight
  const titleLower = feed.title.toLowerCase();
  normalizedKeywords.forEach(keyword => {
    if (titleLower.includes(keyword)) {
      score += 0.4;
    }
  });
  
  // Description match: 0.3 weight
  const descriptionLower = feed.description.toLowerCase();
  normalizedKeywords.forEach(keyword => {
    if (descriptionLower.includes(keyword)) {
      score += 0.3;
    }
  });
  
  // Category match: 0.2 weight
  const categoryLower = feed.category.toLowerCase();
  normalizedKeywords.forEach(keyword => {
    if (categoryLower.includes(keyword)) {
      score += 0.2;
    }
  });
  
  // Tag match: 0.1 weight
  const tagsLower = feed.tags.map(tag => tag.toLowerCase());
  normalizedKeywords.forEach(keyword => {
    if (tagsLower.some(tag => tag.includes(keyword))) {
      score += 0.1;
    }
  });
  
  // Language penalty: reduce by 30% if language doesn't match
  if (preferredLanguage && feed.language !== preferredLanguage) {
    score *= 0.7;
  }
  
  // Cap score at 1.0
  return Math.min(score, 1.0);
}

/**
 * Validate input parameters
 */
function validateInput(parameters) {
  const errors = [];
  
  // Check keywords
  if (!parameters.keywords) {
    errors.push('keywords parameter is required');
  } else if (Array.isArray(parameters.keywords) && parameters.keywords.length === 0) {
    errors.push('keywords array cannot be empty');
  } else if (typeof parameters.keywords === 'string' && parameters.keywords.trim() === '') {
    errors.push('keywords string cannot be empty');
  }
  
  // Check limit
  if (parameters.limit !== undefined) {
    const limit = parseInt(parameters.limit);
    if (isNaN(limit) || limit < 1 || limit > 20) {
      errors.push('limit must be between 1 and 20');
    }
  }
  
  // Check language
  if (parameters.language !== undefined) {
    if (!['ja', 'en'].includes(parameters.language)) {
      errors.push('language must be "ja" or "en"');
    }
  }
  
  return errors;
}

/**
 * Lambda handler for feed search
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from Bedrock Agent event
    let parameters = {};
    
    // Bedrock Agent sends parameters in requestBody.content['application/json'].properties
    if (event.requestBody && event.requestBody.content && event.requestBody.content['application/json']) {
      const properties = event.requestBody.content['application/json'].properties || [];
      
      // Convert properties array to parameters object
      properties.forEach(prop => {
        if (prop.name === 'keywords') {
          // Parse keywords - can be comma-separated string, JSON array string, or array
          if (typeof prop.value === 'string') {
            // Try to parse as JSON array first
            try {
              const parsed = JSON.parse(prop.value);
              if (Array.isArray(parsed)) {
                parameters.keywords = parsed;
              } else {
                // Fallback to comma-separated
                parameters.keywords = prop.value.split(',').map(k => k.trim()).filter(k => k);
              }
            } catch (e) {
              // Not JSON, treat as comma-separated or space-separated
              if (prop.value.includes(',')) {
                parameters.keywords = prop.value.split(',').map(k => k.trim()).filter(k => k);
              } else {
                parameters.keywords = prop.value.split(/\s+/).map(k => k.trim()).filter(k => k);
              }
            }
          } else if (Array.isArray(prop.value)) {
            parameters.keywords = prop.value;
          } else {
            parameters.keywords = [prop.value];
          }
        } else if (prop.name === 'limit') {
          parameters.limit = parseInt(prop.value);
        } else if (prop.name === 'language') {
          parameters.language = prop.value;
        } else {
          parameters[prop.name] = prop.value;
        }
      });
    } else {
      // Fallback to direct parameters (for testing)
      parameters = event.parameters || {};
    }
    
    // Check if this is a validation request
    if (parameters.action === 'validate' && parameters.feedUrls) {
      console.log('Validation request received');
      return await handleValidation(parameters);
    }
    
    // Validate input
    const validationErrors = validateInput(parameters);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return {
        messageVersion: "1.0",
        response: {
          actionGroup: event.actionGroup || "feed-search",
          apiPath: event.apiPath || "/search-feeds",
          httpMethod: event.httpMethod || "POST",
          httpStatusCode: 400,
          responseBody: {
            "application/json": {
              body: JSON.stringify({
                error: 'Invalid input parameters',
                details: validationErrors
              })
            }
          }
        }
      };
    }
    
    // Normalize keywords (accept both array and string)
    let keywords = parameters.keywords;
    if (typeof keywords === 'string') {
      keywords = [keywords];
    }
    
    const language = parameters.language || null;
    const limit = parseInt(parameters.limit || '5');
    
    console.log(`Searching feeds for keywords: ${keywords.join(', ')}, language: ${language || 'any'}, limit: ${limit}`);
    
    // Calculate relevance scores for all feeds
    const scoredFeeds = feedDatabase.map(feed => {
      const relevance = calculateRelevance(feed, keywords, language);
      return {
        ...feed,
        relevance
      };
    });
    
    // Filter feeds with relevance > 0 and sort by relevance (descending)
    const relevantFeeds = scoredFeeds
      .filter(feed => feed.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
    
    console.log(`Found ${relevantFeeds.length} relevant feeds from database`);
    
    // Log matching details for each feed
    relevantFeeds.forEach(feed => {
      console.log(`Feed: ${feed.title}, Relevance: ${feed.relevance.toFixed(3)}, Language: ${feed.language}`);
    });
    
    // Return results in Bedrock Agent format
    const responseBody = {
      feeds: relevantFeeds.map(feed => ({
        url: feed.url,
        title: feed.title,
        description: feed.description,
        category: feed.category,
        relevance: feed.relevance
      })),
      total: relevantFeeds.length,
      source: 'database'
    };
    
    return {
      messageVersion: "1.0",
      response: {
        actionGroup: event.actionGroup || "feed-search",
        apiPath: event.apiPath || "/search-feeds",
        httpMethod: event.httpMethod || "POST",
        httpStatusCode: 200,
        responseBody: {
          "application/json": {
            body: JSON.stringify(responseBody)
          }
        }
      }
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      messageVersion: "1.0",
      response: {
        actionGroup: event.actionGroup || "feed-search",
        apiPath: event.apiPath || "/search-feeds",
        httpMethod: event.httpMethod || "POST",
        httpStatusCode: 500,
        responseBody: {
          "application/json": {
            body: JSON.stringify({
              error: 'Internal server error',
              message: error.message
            })
          }
        }
      }
    };
  }
};

/**
 * Handle feed URL validation
 */
async function handleValidation(parameters) {
  const feedUrls = Array.isArray(parameters.feedUrls) 
    ? parameters.feedUrls 
    : [parameters.feedUrls];
  
  console.log(`Validating ${feedUrls.length} feed URLs`);
  
  const validationResults = await Promise.all(
    feedUrls.map(async (url) => {
      console.log(`Validating: ${url}`);
      const validation = await validateFeedUrl(url);
      
      if (validation.valid) {
        const metadata = await fetchFeedMetadata(url);
        return {
          url: url,
          valid: true,
          title: metadata.title,
          description: metadata.description,
          statusCode: validation.statusCode
        };
      } else {
        return {
          url: url,
          valid: false,
          error: validation.error || 'Invalid feed',
          statusCode: validation.statusCode
        };
      }
    })
  );
  
  const validFeeds = validationResults.filter(r => r.valid);
  const invalidFeeds = validationResults.filter(r => !r.valid);
  
  console.log(`Validation complete: ${validFeeds.length} valid, ${invalidFeeds.length} invalid`);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      validFeeds: validFeeds,
      invalidFeeds: invalidFeeds,
      total: feedUrls.length,
      validCount: validFeeds.length,
      invalidCount: invalidFeeds.length
    })
  };
}
