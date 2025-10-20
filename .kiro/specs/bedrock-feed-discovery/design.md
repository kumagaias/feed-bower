# Design Document

## Overview

This design implements AI-powered RSS/Atom feed discovery using Amazon Bedrock Agent Core with Claude 3 Haiku. The system provides intelligent feed recommendations based on user keywords while maintaining a robust fallback mechanism for reliability.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Lambda         │─────▶│  Bedrock Agent   │
│  (Go Backend)   │      │  Runtime         │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │  Lambda Executor │
         │               │  (Feed Search)   │
         │               └────────┬─────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │  Feed Database   │
         │               │  (JSON)          │
         │               └──────────────────┘
         │
         ▼
┌─────────────────┐
│   DynamoDB      │
│  (User Data)    │
└─────────────────┘
```

### Component Interaction Flow

1. **User Request**: User provides keywords through frontend
2. **API Call**: Frontend calls `/api/feeds/recommendations`
3. **Backend Processing**: 
   - Lambda receives request
   - Validates user authentication
   - Calls FeedService.GetFeedRecommendations()
4. **Bedrock Invocation**:
   - If BEDROCK_AGENT_ID is configured, invoke Bedrock Agent
   - Bedrock Agent calls Lambda Executor
   - Lambda Executor searches Feed Database
   - Returns ranked results
5. **Fallback**: If Bedrock fails, use static keyword mapping
6. **Response**: Return feed recommendations to frontend

## Components and Interfaces

### 1. Bedrock Client (Go)

**Location**: `back/pkg/bedrock/client.go`

**Interface**:
```go
type Client struct {
    client  *bedrockagentruntime.Client
    agentID string
    aliasID string
}

func NewClient(cfg aws.Config, agentID, aliasID string) *Client

func (c *Client) GetFeedRecommendations(ctx context.Context, keywords []string) ([]FeedRecommendation, error)
```

**Responsibilities**:
- Manage Bedrock Agent Runtime client
- Format prompts for feed search
- Parse streaming responses
- Handle errors and timeouts

**Implementation Details**:
- Uses AWS SDK v2 for Go
- Implements streaming response handling
- Generates unique session IDs per request
- Timeout: 10 seconds

### 2. Feed Service (Go)

**Location**: `back/internal/service/feed_service.go`

**Modified Method**:
```go
func (s *feedService) GetFeedRecommendations(
    ctx context.Context, 
    userID string, 
    bowerID string, 
    keywords []string
) ([]*model.Feed, error)
```

**Logic Flow**:
```
1. Validate inputs (userID, bowerID, keywords)
2. Check if BEDROCK_AGENT_ID is configured
3. If configured:
   a. Call getFeedRecommendationsFromBedrock()
   b. If successful, return results
   c. If error, log and continue to fallback
4. Use static keyword mapping (existing logic)
5. Return recommendations
```

**New Helper Method**:
```go
func (s *feedService) getFeedRecommendationsFromBedrock(
    ctx context.Context, 
    keywords []string
) ([]*model.Feed, error)
```

### 3. Lambda Executor (Node.js)

**Location**: `infra/modules/bedrock-agent/lambda/index.js`

**Handler**:
```javascript
exports.handler = async (event) => {
    const { actionGroup, function: functionName, parameters } = event;
    
    if (actionGroup === 'feed-search' && functionName === 'search-feeds') {
        return await searchFeeds(parameters);
    }
    
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
}
```

**Search Algorithm**:
```javascript
async function searchFeeds(parameters) {
    const { keywords, language = 'ja', limit = 5 } = parameters;
    
    // Calculate relevance scores
    for each feed in database:
        relevance = 0
        for each keyword:
            if keyword in title: relevance += 0.4
            if keyword in description: relevance += 0.3
            if keyword in category: relevance += 0.2
            if keyword in tags: relevance += 0.1
        
        if language != feed.language:
            relevance *= 0.7
        
        if relevance > 0:
            add to results
    
    // Sort by relevance and return top N
    return top(limit) results sorted by relevance desc
}
```

### 4. Feed Database (JSON)

**Location**: `infra/modules/bedrock-agent/lambda/feed-database.json`

**Schema**:
```json
{
  "feeds": [
    {
      "url": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "language": "ja|en",
      "tags": ["string"],
      "lastUpdated": "ISO8601 datetime"
    }
  ]
}
```

**Initial Content**: 20+ curated feeds covering:
- Technology (AI, programming, cloud)
- News (Japanese and English)
- Science
- Business

## Data Models

### FeedRecommendation (Go)

```go
type FeedRecommendation struct {
    URL         string  `json:"url"`
    Title       string  `json:"title"`
    Description string  `json:"description"`
    Category    string  `json:"category"`
    Relevance   float64 `json:"relevance"`
}
```

### Bedrock Agent Configuration

**Agent Settings**:
- Name: `feed-bower-agent-production`
- Model: `anthropic.claude-3-haiku-20240307-v1:0`
- Instructions: Detailed prompt for feed discovery
- Timeout: 30 seconds

**Action Group**:
- Name: `feed-search`
- Executor: Lambda function
- API Schema: OpenAPI 3.0 specification

## Error Handling

### Error Scenarios and Responses

| Scenario | Detection | Response | User Impact |
|----------|-----------|----------|-------------|
| Bedrock Agent unavailable | Connection timeout | Log error, use fallback | None (transparent) |
| Invalid keywords | Empty array | Return validation error | Error message shown |
| Lambda executor error | 500 response | Log error, use fallback | None (transparent) |
| No matching feeds | Empty results | Return empty array | "No recommendations" message |
| Bedrock quota exceeded | ThrottlingException | Log error, use fallback | None (transparent) |

### Logging Strategy

**Backend Logs**:
```go
log.Printf("🤖 Bedrock Agent request: keywords=%v", keywords)
log.Printf("✅ Bedrock Agent response: %d recommendations", len(recommendations))
log.Printf("⚠️ Bedrock Agent error, using fallback: %v", err)
log.Printf("📋 Using static keyword mapping for recommendations")
```

**Lambda Logs**:
```javascript
console.log('🤖 Bedrock Agent Action Event:', JSON.stringify(event, null, 2));
console.log('🔍 Starting feed search with parameters:', parameters);
console.log('📈 Match found:', feed.title, 'relevance:', relevance);
console.log('🎯 Found N matches, returning top M');
```

## Testing Strategy

### Unit Tests

**Backend (Go)**:
- `TestBedrockClient_GetFeedRecommendations`: Mock Bedrock responses
- `TestFeedService_GetFeedRecommendationsWithBedrock`: Test integration
- `TestFeedService_FallbackMechanism`: Verify fallback works

**Lambda (Node.js)**:
- Test keyword matching algorithm
- Test relevance scoring
- Test language filtering
- Test parameter validation

### Integration Tests

**End-to-End Flow**:
1. Deploy Bedrock Agent to test environment
2. Call API with test keywords
3. Verify Bedrock is invoked
4. Verify correct feeds returned
5. Simulate Bedrock failure
6. Verify fallback works

**Test Cases**:
- Japanese keywords → Japanese feeds prioritized
- English keywords → English feeds prioritized
- Mixed keywords → Balanced results
- No matches → Empty array
- Invalid parameters → Error response

### Performance Tests

**Metrics to Monitor**:
- Bedrock response time (target: < 5s)
- Fallback response time (target: < 2s)
- Success rate (target: > 95%)
- Error rate (target: < 5%)

## Deployment Strategy

### Phase 1: Infrastructure Setup

1. Create Terraform module for Bedrock Agent
2. Create Lambda function with feed database
3. Deploy to production
4. Verify Agent is accessible

### Phase 2: Backend Integration

1. Update environment variables:
   - `BEDROCK_AGENT_ID`
   - `BEDROCK_AGENT_ALIAS`
   - `BEDROCK_REGION`
2. Deploy backend with Bedrock integration
3. Test with feature flag (if needed)

### Phase 3: Monitoring and Optimization

1. Set up CloudWatch dashboards
2. Monitor Bedrock usage and costs
3. Tune relevance scoring based on feedback
4. Expand feed database

## Configuration

### Environment Variables

**Backend (Lambda)**:
```bash
BEDROCK_AGENT_ID=<agent-id>           # Required for Bedrock
BEDROCK_AGENT_ALIAS=production        # Default: production
BEDROCK_REGION=ap-northeast-1         # Default: ap-northeast-1
```

**Terraform Variables**:
```hcl
variable "enable_bedrock" {
  description = "Enable Bedrock Agent integration"
  type        = bool
  default     = true
}
```

### IAM Permissions

**Lambda Execution Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent"
      ],
      "Resource": "arn:aws:bedrock:*:*:agent/*"
    }
  ]
}
```

**Bedrock Agent Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:*-feed-search"
    }
  ]
}
```

## Monitoring and Observability

### CloudWatch Metrics

**Custom Metrics**:
- `BedrockInvocations`: Count of Bedrock calls
- `BedrockErrors`: Count of Bedrock failures
- `FallbackUsage`: Count of fallback usage
- `BedrockLatency`: Response time distribution

**Alarms**:
- Error rate > 10% for 5 minutes
- Latency > 10 seconds for 3 consecutive periods
- Fallback usage > 50% for 10 minutes

### Logging

**Log Groups**:
- `/aws/lambda/feed-bower-api-production`: Backend logs
- `/aws/lambda/feed-bower-feed-search-production`: Lambda executor logs
- `/aws/bedrock/agent/feed-bower-agent-production`: Bedrock Agent logs

## Security Considerations

1. **API Authentication**: All requests require valid JWT token
2. **IAM Least Privilege**: Each component has minimal required permissions
3. **Input Validation**: Keywords are validated and sanitized
4. **Rate Limiting**: API Gateway throttling prevents abuse
5. **Secrets Management**: No hardcoded credentials

## Cost Estimation

**Monthly Costs (estimated)**:
- Bedrock Agent: ~$0 (free tier covers development usage)
- Claude 3 Haiku invocations: ~$5-10 (based on usage)
- Lambda executor: ~$0.20 (minimal compute)
- Total: ~$5-15/month

**Cost Optimization**:
- Use fallback for non-critical requests
- Cache common keyword combinations
- Monitor and set budget alerts

## Future Enhancements

1. **Caching Layer**: Cache Bedrock responses for common keywords
2. **User Feedback**: Allow users to rate recommendations
3. **Learning System**: Improve recommendations based on user behavior
4. **Multi-language Support**: Expand beyond Japanese and English
5. **Real-time Feed Validation**: Check if feeds are still active
6. **Personalization**: Use user history to improve recommendations
