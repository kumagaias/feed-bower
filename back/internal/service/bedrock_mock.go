package service

import (
	"context"

	"feed-bower-api/pkg/bedrock"
)

// MockBedrockClient is a mock implementation of Bedrock client for testing
type MockBedrockClient struct {
	recommendations []bedrock.FeedRecommendation
	err             error
}

// NewMockBedrockClient creates a new mock Bedrock client
func NewMockBedrockClient() *MockBedrockClient {
	return &MockBedrockClient{
		recommendations: []bedrock.FeedRecommendation{
			{
				URL:         "https://example.com/tech-feed.xml",
				Title:       "Tech News Feed",
				Description: "Latest technology news",
				Category:    "Technology",
				Relevance:   0.95,
			},
			{
				URL:         "https://example.com/ai-feed.xml",
				Title:       "AI Research Feed",
				Description: "Artificial Intelligence research updates",
				Category:    "AI",
				Relevance:   0.90,
			},
			{
				URL:         "https://example.com/programming-feed.xml",
				Title:       "Programming Blog",
				Description: "Programming tutorials and tips",
				Category:    "Programming",
				Relevance:   0.85,
			},
		},
	}
}

// GetFeedRecommendations returns mock feed recommendations
func (m *MockBedrockClient) GetFeedRecommendations(ctx context.Context, keywords []string) ([]bedrock.FeedRecommendation, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.recommendations, nil
}

// SetRecommendations sets custom recommendations for testing
func (m *MockBedrockClient) SetRecommendations(recommendations []bedrock.FeedRecommendation) {
	m.recommendations = recommendations
}

// SetError sets an error to be returned by GetFeedRecommendations
func (m *MockBedrockClient) SetError(err error) {
	m.err = err
}
