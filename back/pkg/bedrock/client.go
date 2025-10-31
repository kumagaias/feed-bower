package bedrock

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
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
	// Explicit prompt requesting 20+ feeds
	keywordsStr := strings.Join(keywords, ", ")
	prompt := fmt.Sprintf("Please recommend 20 or more RSS/Atom feeds for these keywords: %s. Return ONLY a JSON array with at least 20 feeds.", keywordsStr)

	// Generate session ID
	sessionID := generateSessionID()

	// Log invocation details
	fmt.Printf("[BedrockClient] INVOKE_REQUEST | agent_id=%s | alias_id=%s | session_id=%s | keywords=%v | keyword_count=%d\n",
		c.agentID, c.aliasID, sessionID, keywords, len(keywords))

	// Invoke Bedrock Agent
	input := &bedrockagentruntime.InvokeAgentInput{
		AgentId:      aws.String(c.agentID),
		AgentAliasId: aws.String(c.aliasID),
		SessionId:    aws.String(sessionID),
		InputText:    aws.String(prompt),
	}

	invokeStart := time.Now()
	output, err := c.client.InvokeAgent(ctx, input)
	invokeLatency := time.Since(invokeStart).Milliseconds()

	if err != nil {
		fmt.Printf("[BedrockClient] INVOKE_FAILED | agent_id=%s | session_id=%s | keywords=%v | latency_ms=%d | error=%v\n",
			c.agentID, sessionID, keywords, invokeLatency, err)
		return nil, fmt.Errorf("failed to invoke Bedrock agent: %w", err)
	}

	fmt.Printf("[BedrockClient] INVOKE_SUCCESS | agent_id=%s | session_id=%s | keywords=%v | latency_ms=%d\n",
		c.agentID, sessionID, keywords, invokeLatency)

	// Parse response
	recommendations := make([]FeedRecommendation, 0)
	chunkCount := 0
	parseStart := time.Now()

	// Process event stream
	for event := range output.GetStream().Events() {
		fmt.Printf("[BedrockClient] EVENT_RECEIVED | session_id=%s | event_type=%T\n", sessionID, event)

		switch v := event.(type) {
		case *types.ResponseStreamMemberReturnControl:
			// Log return control event for debugging
			fmt.Printf("[BedrockClient] RETURN_CONTROL_RECEIVED | session_id=%s | invocation_count=%d\n",
				sessionID, len(v.Value.InvocationInputs))
		case *types.ResponseStreamMemberChunk:
			chunkCount++
			chunkText := string(v.Value.Bytes)
			fmt.Printf("[BedrockClient] CHUNK_RECEIVED | session_id=%s | chunk_number=%d | chunk_size_bytes=%d | chunk_text=%s\n",
				sessionID, chunkCount, len(v.Value.Bytes), chunkText)

			// Try to parse as JSON first
			var chunkData map[string]interface{}
			if err := json.Unmarshal(v.Value.Bytes, &chunkData); err != nil {
				// Not JSON, might be text containing JSON
				fmt.Printf("[BedrockClient] CHUNK_NOT_JSON | session_id=%s | chunk_number=%d | trying_text_extraction\n",
					sessionID, chunkCount)

				// Try to extract JSON from text (Bedrock might wrap it in text)
				// Look for JSON array pattern in text - support both [{...}] and [\n{...}\n]
				if strings.Contains(chunkText, "[") && strings.Contains(chunkText, "]") {
					// Find the first [ and last ]
					start := strings.Index(chunkText, "[")
					end := strings.LastIndex(chunkText, "]") + 1
					if start >= 0 && end > start {
						jsonStr := chunkText[start:end]
						fmt.Printf("[BedrockClient] JSON_EXTRACTED | session_id=%s | json_length=%d | json_preview=%s\n",
							sessionID, len(jsonStr), truncateString(jsonStr, 200))

						var feedsData []interface{}
						if err := json.Unmarshal([]byte(jsonStr), &feedsData); err == nil {
							fmt.Printf("[BedrockClient] FEEDS_PARSED_FROM_TEXT | session_id=%s | feed_count=%d\n",
								sessionID, len(feedsData))

							for feedIdx, feed := range feedsData {
								if feedMap, ok := feed.(map[string]interface{}); ok {
									rec := FeedRecommendation{
										URL:         getString(feedMap, "url"),
										Title:       getString(feedMap, "title"),
										Description: getString(feedMap, "description"),
										Category:    getString(feedMap, "category"),
										Relevance:   getFloat(feedMap, "relevance"),
									}
									if rec.URL != "" {
										fmt.Printf("[BedrockClient] FEED_PARSED_FROM_TEXT | session_id=%s | chunk_number=%d | feed_index=%d | url=%s | title=%s | relevance=%.2f\n",
											sessionID, chunkCount, feedIdx, rec.URL, rec.Title, rec.Relevance)
										recommendations = append(recommendations, rec)
									}
								}
							}
						} else {
							fmt.Printf("[BedrockClient] JSON_PARSE_FAILED | session_id=%s | error=%v | json_preview=%s\n",
								sessionID, err, truncateString(jsonStr, 200))
						}
					}
				}
				continue
			}

			// Check if body exists and parse it
			var feedsData []interface{}

			// Try multiple paths to find feeds data
			// 1. Check for "body" field (Lambda response format)
			if bodyStr, ok := chunkData["body"].(string); ok {
				fmt.Printf("[BedrockClient] BODY_FOUND | session_id=%s | chunk_number=%d | body_length=%d | body_preview=%s\n",
					sessionID, chunkCount, len(bodyStr), truncateString(bodyStr, 200))

				var bodyData map[string]interface{}
				if err := json.Unmarshal([]byte(bodyStr), &bodyData); err != nil {
					fmt.Printf("[BedrockClient] BODY_PARSE_ERROR | session_id=%s | chunk_number=%d | error=%v | body=%s\n",
						sessionID, chunkCount, err, bodyStr)
					continue
				}

				if feeds, ok := bodyData["feeds"].([]interface{}); ok {
					feedsData = feeds
					fmt.Printf("[BedrockClient] FEEDS_FOUND_IN_BODY | session_id=%s | chunk_number=%d | feed_count=%d\n",
						sessionID, chunkCount, len(feedsData))
				} else {
					fmt.Printf("[BedrockClient] NO_FEEDS_IN_BODY | session_id=%s | chunk_number=%d | body_keys=%v\n",
						sessionID, chunkCount, getKeys(bodyData))
				}
			} else if feeds, ok := chunkData["feeds"].([]interface{}); ok {
				// 2. Fallback: feeds directly in chunk
				feedsData = feeds
				fmt.Printf("[BedrockClient] FEEDS_FOUND_DIRECTLY | session_id=%s | chunk_number=%d | feed_count=%d\n",
					sessionID, chunkCount, len(feedsData))
			} else {
				fmt.Printf("[BedrockClient] NO_FEEDS_FOUND | session_id=%s | chunk_number=%d | chunk_keys=%v\n",
					sessionID, chunkCount, getKeys(chunkData))
			}

			// Extract recommendations from feeds
			if len(feedsData) > 0 {
				fmt.Printf("[BedrockClient] CHUNK_FEEDS_FOUND | session_id=%s | chunk_number=%d | feed_count=%d\n",
					sessionID, chunkCount, len(feedsData))

				for feedIdx, feed := range feedsData {
					if feedMap, ok := feed.(map[string]interface{}); ok {
						rec := FeedRecommendation{
							URL:         getString(feedMap, "url"),
							Title:       getString(feedMap, "title"),
							Description: getString(feedMap, "description"),
							Category:    getString(feedMap, "category"),
							Relevance:   getFloat(feedMap, "relevance"),
						}
						if rec.URL != "" {
							fmt.Printf("[BedrockClient] FEED_PARSED | session_id=%s | chunk_number=%d | feed_index=%d | url=%s | title=%s | relevance=%.2f\n",
								sessionID, chunkCount, feedIdx, rec.URL, rec.Title, rec.Relevance)
							recommendations = append(recommendations, rec)
						} else {
							fmt.Printf("[BedrockClient] FEED_SKIPPED | session_id=%s | chunk_number=%d | feed_index=%d | reason=empty_url\n",
								sessionID, chunkCount, feedIdx)
						}
					}
				}
			}
		case *types.ResponseStreamMemberTrace:
			fmt.Printf("[BedrockClient] TRACE_RECEIVED | session_id=%s | trace_type=bedrock_trace\n",
				sessionID)
		default:
			fmt.Printf("[BedrockClient] UNKNOWN_EVENT | session_id=%s | event_type=%T\n",
				sessionID, event)
		}
	}

	parseLatency := time.Since(parseStart).Milliseconds()
	totalLatency := time.Since(invokeStart).Milliseconds()

	fmt.Printf("[BedrockClient] RESPONSE_COMPLETE | session_id=%s | keywords=%v | total_chunks=%d | total_feeds=%d | parse_latency_ms=%d | total_latency_ms=%d\n",
		sessionID, keywords, chunkCount, len(recommendations), parseLatency, totalLatency)

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

func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func generateSessionID() string {
	// Generate a unique session ID
	return fmt.Sprintf("session-%d", time.Now().UnixNano())
}
