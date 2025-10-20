package bedrock

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime/types"
)

// Client wraps Bedrock Agent Runtime client
type Client struct {
	client  *bedrockagentruntime.Client
	agentID string
	aliasID string
}

// NewClient creates a new Bedrock client
func NewClient(cfg aws.Config, agentID, aliasID string) *Client {
	return &Client{
		client:  bedrockagentruntime.NewFromConfig(cfg),
		agentID: agentID,
		aliasID: aliasID,
	}
}

// FeedRecommendation represents a feed recommendation from Bedrock
type FeedRecommendation struct {
	URL         string  `json:"url"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Relevance   float64 `json:"relevance"`
}

// GetFeedRecommendations gets feed recommendations based on keywords using Bedrock Agent
func (c *Client) GetFeedRecommendations(ctx context.Context, keywords []string) ([]FeedRecommendation, error) {
	if len(keywords) == 0 {
		return nil, fmt.Errorf("keywords are required")
	}

	// Create prompt for Bedrock Agent
	prompt := fmt.Sprintf("Find RSS/Atom feed URLs related to these keywords: %v. Return a JSON array of feeds with url, title, description, category, and relevance score.", keywords)

	// Invoke Bedrock Agent
	input := &bedrockagentruntime.InvokeAgentInput{
		AgentId:      aws.String(c.agentID),
		AgentAliasId: aws.String(c.aliasID),
		SessionId:    aws.String(generateSessionID()),
		InputText:    aws.String(prompt),
	}

	output, err := c.client.InvokeAgent(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to invoke Bedrock agent: %w", err)
	}

	// Parse response
	recommendations := make([]FeedRecommendation, 0)

	// Process event stream
	for event := range output.GetStream().Events() {
		switch v := event.(type) {
		case *types.ResponseStreamMemberChunk:
			// Parse chunk bytes
			var chunkData map[string]interface{}
			if err := json.Unmarshal(v.Value.Bytes, &chunkData); err != nil {
				continue
			}

			// Extract recommendations from chunk
			if feeds, ok := chunkData["feeds"].([]interface{}); ok {
				for _, feed := range feeds {
					if feedMap, ok := feed.(map[string]interface{}); ok {
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
		}
	}

	return recommendations, nil
}

// Helper functions
func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key].(float64); ok {
		return v
	}
	return 0.0
}

func generateSessionID() string {
	// Generate a unique session ID
	return fmt.Sprintf("session-%d", time.Now().UnixNano())
}
