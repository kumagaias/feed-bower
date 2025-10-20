const fs = require('fs');
const path = require('path');

// Load feed database
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
    if (isNaN(limit) || limit < 1 || limit > 10) {
      errors.push('limit must be between 1 and 10');
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
    const parameters = event.parameters || {};
    
    // Validate input
    const validationErrors = validateInput(parameters);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid input parameters',
          details: validationErrors
        })
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
    
    console.log(`Found ${relevantFeeds.length} relevant feeds`);
    
    // Log matching details for each feed
    relevantFeeds.forEach(feed => {
      console.log(`Feed: ${feed.title}, Relevance: ${feed.relevance.toFixed(3)}, Language: ${feed.language}`);
    });
    
    // Return results
    return {
      statusCode: 200,
      body: JSON.stringify({
        feeds: relevantFeeds.map(feed => ({
          url: feed.url,
          title: feed.title,
          description: feed.description,
          category: feed.category,
          relevance: feed.relevance
        })),
        total: relevantFeeds.length
      })
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
