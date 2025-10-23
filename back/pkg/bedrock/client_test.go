package bedrock

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestParseBedrockResponse tests parsing of actual Bedrock Agent responses
func TestParseBedrockResponse(t *testing.T) {
	tests := []struct {
		name          string
		chunkText     string
		expectedCount int
		expectedURLs  []string
	}{
		{
			name: "Japanese response with prefix",
			chunkText: `以下のRSS/Atomフィードをおすすめします:
[
{
"url": "https://www.webdesignerdepot.com/feed/",
"title": "Web Designer Depot",
"description": "Web design news, resources and inspiration.",
"category": "Web Development",
"relevance": 0.9
},
{
"url": "https://www.smashingmagazine.com/feed/",
"title": "Smashing Magazine",
"description": "For web designers and developers.",
"category": "Web Development",
"relevance": 0.9
},
{
"url": "https://www.startupgrind.com/feed/",
"title": "Startup Grind",
"description": "Global startup community designed to educate, inspire, and connect entrepreneurs.",
"category": "Startups",
"relevance": 0.8
},
{
"url": "https://www.techcrunch.com/feed/",
"title": "TechCrunch",
"description": "Startup and technology news.",
"category": "Startups",
"relevance": 0.8
},
{
"url": "https://www.producthunt.com/feed",
"title": "Product Hunt",
"description": "The best new products in tech.",
"category": "Startups",
"relevance": 0.8
}
]`,
			expectedCount: 5,
			expectedURLs: []string{
				"https://www.webdesignerdepot.com/feed/",
				"https://www.smashingmagazine.com/feed/",
				"https://www.startupgrind.com/feed/",
				"https://www.techcrunch.com/feed/",
				"https://www.producthunt.com/feed",
			},
		},
		{
			name: "English response with prefix",
			chunkText: `Here are the recommended RSS/Atom feeds:
[
{
"url": "https://dev.to/feed",
"title": "DEV Community",
"description": "A community of software developers.",
"category": "Programming",
"relevance": 1.0
},
{
"url": "https://cloud.google.com/blog/rss",
"title": "Google Cloud Blog",
"description": "News and updates from Google Cloud.",
"category": "Cloud",
"relevance": 1.0
}
]`,
			expectedCount: 2,
			expectedURLs: []string{
				"https://dev.to/feed",
				"https://cloud.google.com/blog/rss",
			},
		},
		{
			name: "Compact JSON without prefix",
			chunkText: `[{"url":"https://example.com/feed","title":"Example Feed","description":"Test","category":"Test","relevance":0.5}]`,
			expectedCount: 1,
			expectedURLs: []string{
				"https://example.com/feed",
			},
		},
		{
			name:          "Empty array",
			chunkText:     `[]`,
			expectedCount: 0,
			expectedURLs:  []string{},
		},
		{
			name:          "No JSON array",
			chunkText:     `This is just plain text without any JSON`,
			expectedCount: 0,
			expectedURLs:  []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recommendations := parseTextForFeeds(tt.chunkText)
			
			assert.Equal(t, tt.expectedCount, len(recommendations), "Expected %d feeds, got %d", tt.expectedCount, len(recommendations))
			
			if tt.expectedCount > 0 {
				for i, expectedURL := range tt.expectedURLs {
					if i < len(recommendations) {
						assert.Equal(t, expectedURL, recommendations[i].URL, "Feed %d URL mismatch", i)
					}
				}
			}
		})
	}
}

// TestFeedRecommendationFields tests that all fields are properly extracted
func TestFeedRecommendationFields(t *testing.T) {
	chunkText := `[
{
"url": "https://example.com/feed",
"title": "Example Feed",
"description": "A test feed",
"category": "Testing",
"relevance": 0.95
}
]`

	recommendations := parseTextForFeeds(chunkText)
	
	assert.Equal(t, 1, len(recommendations))
	
	feed := recommendations[0]
	assert.Equal(t, "https://example.com/feed", feed.URL)
	assert.Equal(t, "Example Feed", feed.Title)
	assert.Equal(t, "A test feed", feed.Description)
	assert.Equal(t, "Testing", feed.Category)
	assert.Equal(t, 0.95, feed.Relevance)
}

// TestInvalidFeedSkipped tests that feeds without URLs are skipped
func TestInvalidFeedSkipped(t *testing.T) {
	chunkText := `[
{
"title": "Feed without URL",
"description": "This should be skipped",
"category": "Invalid",
"relevance": 1.0
},
{
"url": "https://valid.com/feed",
"title": "Valid Feed",
"description": "This should be included",
"category": "Valid",
"relevance": 0.8
}
]`

	recommendations := parseTextForFeeds(chunkText)
	
	assert.Equal(t, 1, len(recommendations), "Should only include feeds with URLs")
	assert.Equal(t, "https://valid.com/feed", recommendations[0].URL)
	assert.Equal(t, "Valid Feed", recommendations[0].Title)
}

// Helper function extracted from client.go logic for testing
func parseTextForFeeds(chunkText string) []FeedRecommendation {
	recommendations := make([]FeedRecommendation, 0)
	
	// Look for JSON array pattern in text
	if len(chunkText) == 0 {
		return recommendations
	}
	
	// Find the first [ and last ]
	start := -1
	end := -1
	
	for i := 0; i < len(chunkText); i++ {
		if chunkText[i] == '[' && start == -1 {
			start = i
		}
	}
	
	for i := len(chunkText) - 1; i >= 0; i-- {
		if chunkText[i] == ']' && end == -1 {
			end = i + 1
			break
		}
	}
	
	if start >= 0 && end > start {
		jsonStr := chunkText[start:end]
		
		// Try to parse as JSON array
		var feedsData []map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &feedsData); err == nil {
			for _, feedMap := range feedsData {
				rec := FeedRecommendation{
					URL:         getString(feedMap, "url"),
					Title:       getString(feedMap, "title"),
					Description: getString(feedMap, "description"),
					Category:    getString(feedMap, "category"),
					Relevance:   getFloat(feedMap, "relevance"),
				}
				if rec.URL != "" {
					recommendations = append(recommendations, rec)
				}
			}
		}
	}
	
	return recommendations
}
