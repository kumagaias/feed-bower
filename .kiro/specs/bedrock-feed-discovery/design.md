# Design Document

## Overview

This design document outlines the technical architecture for integrating Amazon Bedrock Agent Core into Feed Bower to provide AI-powered RSS/Atom feed discovery. The system uses Claude 3 Haiku to intelligently match user keywords with a curated database of feeds, with a fallback to static keyword mapping for reliability.

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │ Keywords
       ▼
┌─────────────────────────────────────────┐
│         Feed Bower Backend              │
│  ┌───────────────────────────────────┐  │
│  │      Feed Service                 │  │
│  │  - GetFeedRecommendations()       │  │
│  │  - Try Bedrock → Fallback         │  │
│  └────────┬──────────────────┬───────┘  │
│           │                  │          │
│           ▼                  ▼          │
│  ┌────────────────┐  ┌──────────────┐  │
│  │ Bedrock Client │  │Static Mapping│  │
│  └────────┬───────┘  └──────────────┘  │
└───────────┼──────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│      Amazon Bedrock Agent                 │
│  ┌─────────────────────────────────────┐  │
│  │  Claude 3 Haiku                     │  │
│  │  - Analyze keywords                 │  │
│  │  - Generate search query            │  │
│  └──────────────┬──────────────────────┘  │
│                 │                          │
│                 ▼                          │
│  ┌─────────────────────────────────────┐  │
│  │  Action Group: feed-search          │  │
│  │  - API Schema validation            │  │
│  └──────────────┬──────────────────────┘  │
└─────────────────┼──────────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────────┐
│      AWS Lambda Function                  │
│  ┌─────────────────────────────────────┐  │
│  │  Feed Search Executor               │  │
│  │  - Load feed database               │  │
│  │  - Calculate relevance scores       │  │
│  │  - Return top matches               │  │
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │  Feed Database (JSON)               │  │
│  │  - 20+ curated feeds                │  │
│  │  - Metadata (tags, category, lang)  │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Bedrock Client (Go)

**Location**: `back/pkg/bedrock/client.go`

**Status**: ✅ Already implemented

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
- Invoke Bedrock Agent with keyword parameters
- Parse streaming response from Bedrock
- Extract feed recommendations from response
- Handle errors and timeouts

### 2. Feed Service Integration (Go)

**Location**: `back/internal/service/feed_service.go`

**Current State**: Has TODO comment for Bedrock integration

**Updated Interface**:
```go
func (s *feedService) GetFeedRecommendations(ctx context.Context, userID string, bowerID string, keywords []string) ([]*model.Feed, error) {
    // 1. Validate inputs
    // 2. Try Bedrock Agent (if configured)
    // 3. Fallback to static mapping on error
    // 4. Convert to model.Feed
    // 5. Return results
}

func (s *feedService) getFeedRecommendationsFromBedrock(ctx context.Context, keywords []string) ([]*model.Feed, error) {
    // New private method for Bedrock integration
}
```

**Configuration**:
```go
type Config struct {
    BedrockAgentID    string
    BedrockAgentAlias string
    BedrockRegion     string
}
```

### 3. Lambda Function (Node.js)

**Location**: `infra/modules/bedrock-agent/lambda/`

**Files**:
- `index.js` - Main handler
- `feed-database.json` - Curated feed list
- `package.json` - Dependencies

**Handler Signature**:
```javascript
exports.handler = async (event) => {
    // event structure from Bedrock Agent:
    // {
    //   actionGroup: 'feed-search',
    //   function: 'search-feeds',
    //   parameters: {
    //     keywords: ['AI', 'machine learning'],
    //     language: 'ja',
    //     limit: 5
    //   }
    // }
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            feeds: [...],
            total: 5
        })
    };
}
```

**Search Algorithm**:
```javascript
function calculateRelevance(feed, keywords) {
    let score = 0;
    
    // Title match: 0.4 weight
    keywords.forEach(kw => {
        if (feed.title.toLowerCase().includes(kw.toLowerCase())) {
            score += 0.4;
        }
    });
    
    // Description match: 0.3 weight
    keywords.forEach(kw => {
        if (feed.description.toLowerCase().includes(kw.toLowerCase())) {
            score += 0.3;
        }
    });
    
    // Category match: 0.2 weight
    keywords.forEach(kw => {
        if (feed.category.toLowerCase().includes(kw.toLowerCase())) {
            score += 0.2;
        }
    });
    
    // Tag match: 0.1 weight
    keywords.forEach(kw => {
        if (feed.tags.some(tag => tag.toLowerCase().includes(kw.toLowerCase()))) {
            score += 0.1;
        }
    });
    
    // Language penalty
    if (language && feed.language !== language) {
        score *= 0.7;
    }
    
    return Math.min(score, 1.0);
}
```

### 4. Bedrock Agent Configuration

**Terraform Module**: `infra/modules/bedrock-agent/`

**Resources**:
- `aws_bedrockagent_agent` - The Bedrock Agent
- `aws_bedrockagent_agent_action_group` - Feed search action
- `aws_bedrockagent_agent_alias` - Production alias
- `aws_lambda_function` - Feed search executor
- IAM roles and permissions

**Agent Configuration**:
```hcl
resource "aws_bedrockagent_agent" "feed_bower_agent" {
  agent_name              = "feed-bower-agent"
  foundation_model        = "anthropic.claude-3-haiku-20240307-v1:0"
  
  instruction = <<-EOT
    You are an RSS/Atom feed discovery expert.
    Find high-quality feeds related to user keywords.
    Prioritize:
    - Active feeds (recent posts)
    - Trusted sources
    - Language match (Japanese or English)
    - High relevance to keywords
    Return results in JSON format.
  EOT
}
```

## Data Models

### Feed Recommendation (Bedrock Response)

```go
type FeedRecommendation struct {
    URL         string  `json:"url"`
    Title       string  `json:"title"`
    Description string  `json:"description"`
    Category    string  `json:"category"`
    Relevance   float64 `json:"relevance"`
}
```

### Feed Database Entry (Lambda)

```json
{
  "url": "https://example.com/feed.xml",
  "title": "Example Tech Blog",
  "description": "Latest technology news and tutorials",
  "category": "Technology",
  "language": "en",
  "tags": ["tech", "programming", "ai", "web"],
  "lastUpdated": "2024-10-20T10:00:00Z"
}
```

### API Schema (OpenAPI 3.0)

```json
{
  "paths": {
    "/search-feeds": {
      "post": {
        "operationId": "search-feeds",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "maxItems": 8
                  },
                  "language": {
                    "type": "string",
                    "enum": ["ja", "en"],
                    "default": "ja"
                  },
                  "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 5
                  }
                },
                "required": ["keywords"]
              }
            }
          }
        }
      }
    }
  }
}
```

## Error Handling

### Error Flow

```
User Request
    ↓
Feed Service
    ↓
Try Bedrock Agent
    ↓
┌─────────────┐
│  Success?   │
└──┬──────┬───┘
   │Yes   │No
   ↓      ↓
Return  Log Error
Feeds      ↓
        Fallback to
        Static Mapping
           ↓
        Return Feeds
```

### Error Types and Handling

1. **Bedrock Agent Timeout** (>10s)
   - Log: `⚠️ Bedrock timeout after 10s, using fallback`
   - Action: Use static mapping
   - User Impact: None (transparent fallback)

2. **Bedrock Agent Error** (500, 503)
   - Log: `❌ Bedrock error: {error}, using fallback`
   - Action: Use static mapping
   - User Impact: None (transparent fallback)

3. **Invalid Response Format**
   - Log: `⚠️ Invalid Bedrock response format, using fallback`
   - Action: Use static mapping
   - User Impact: None (transparent fallback)

4. **Lambda Execution Error**
   - Log: `❌ Lambda execution failed: {error}`
   - Action: Bedrock retries, then fallback
   - User Impact: Slight delay, then fallback

5. **No Feeds Found**
   - Log: `ℹ️ No feeds found for keywords: {keywords}`
   - Action: Return empty array
   - User Impact: User sees "No recommendations" message

### Logging Strategy

```go
// Success
log.Printf("✅ Bedrock returned %d recommendations in %dms", len(feeds), duration)

// Fallback
log.Printf("⚠️ Bedrock unavailable, using static mapping: %v", err)

// Error
log.Printf("❌ Bedrock error: %v", err)

// Performance
log.Printf("📊 Bedrock latency: %dms, Fallback latency: %dms", bedrockMs, fallbackMs)
```

## Testing Strategy

### Unit Tests

**Backend (Go)**:
```go
// back/pkg/bedrock/client_test.go
func TestClient_GetFeedRecommendations(t *testing.T) {
    // Test cases:
    // - Valid keywords return feeds
    // - Empty keywords return error
    // - Invalid response format handled
    // - Timeout handled
}

// back/internal/service/feed_service_test.go
func TestFeedService_GetFeedRecommendationsWithBedrock(t *testing.T) {
    // Test cases:
    // - Bedrock success path
    // - Bedrock failure triggers fallback
    // - Fallback returns valid feeds
    // - Empty keywords handled
}
```

**Lambda (Node.js)**:
```javascript
// infra/modules/bedrock-agent/lambda/test.js
describe('Feed Search Lambda', () => {
    it('should return feeds for valid keywords', async () => {
        const event = {
            actionGroup: 'feed-search',
            function: 'search-feeds',
            parameters: {
                keywords: ['AI', 'machine learning'],
                language: 'en',
                limit: 5
            }
        };
        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).feeds.length).toBeGreaterThan(0);
    });
    
    it('should calculate relevance scores correctly', () => {
        // Test relevance calculation
    });
    
    it('should handle language filtering', () => {
        // Test language preference
    });
});
```

### Integration Tests

```bash
# Test Bedrock Agent directly
aws bedrock-agent-runtime invoke-agent \
  --agent-id $AGENT_ID \
  --agent-alias-id production \
  --session-id test-$(date +%s) \
  --input-text "Find feeds for: AI, machine learning" \
  --region ap-northeast-1

# Test through API
curl -X POST "$API_URL/api/feeds/recommendations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bower_id": "test-bower",
    "keywords": ["AI", "machine learning"]
  }'
```

### Performance Tests

**Metrics to Track**:
- Bedrock Agent response time (target: <5s)
- Fallback response time (target: <2s)
- Success rate (target: >95%)
- Relevance score distribution

**Load Test**:
```bash
# Simulate 100 concurrent requests
ab -n 1000 -c 100 -T 'application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -p keywords.json \
  "$API_URL/api/feeds/recommendations"
```

## Deployment Strategy

### Phase 1: Infrastructure Setup
1. Create Terraform module for Bedrock Agent
2. Deploy Lambda function with feed database
3. Configure IAM roles and permissions
4. Test Bedrock Agent independently

### Phase 2: Backend Integration
1. Update Feed Service with Bedrock client
2. Add environment variables
3. Deploy backend with feature flag (disabled)
4. Test in staging environment

### Phase 3: Gradual Rollout
1. Enable Bedrock for 10% of requests
2. Monitor metrics and errors
3. Increase to 50% if stable
4. Full rollout to 100%

### Phase 4: Optimization
1. Tune relevance scoring algorithm
2. Expand feed database
3. Optimize Lambda cold start
4. Add caching layer if needed

## Configuration

### Environment Variables

**Backend**:
```bash
BEDROCK_AGENT_ID=ABCDEFGHIJ
BEDROCK_AGENT_ALIAS=production
BEDROCK_REGION=ap-northeast-1
BEDROCK_ENABLED=true
BEDROCK_TIMEOUT=10s
```

**Lambda**:
```bash
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Terraform Variables

```hcl
variable "bedrock_agent_name" {
  description = "Name of the Bedrock Agent"
  default     = "feed-bower-agent"
}

variable "bedrock_model" {
  description = "Foundation model for Bedrock Agent"
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  default     = 30
}

variable "lambda_memory" {
  description = "Lambda function memory in MB"
  default     = 256
}
```

## Monitoring and Observability

### CloudWatch Metrics

**Custom Metrics**:
- `BedrockInvocations` - Total Bedrock calls
- `BedrockSuccesses` - Successful responses
- `BedrockFailures` - Failed responses
- `BedrockLatency` - Response time
- `FallbackUsage` - Fallback invocations

**Alarms**:
- Bedrock error rate > 10%
- Bedrock latency > 8s (p95)
- Fallback usage > 50%

### Logs

**Structured Logging**:
```json
{
  "timestamp": "2024-10-21T10:00:00Z",
  "level": "INFO",
  "service": "feed-service",
  "action": "bedrock_recommendation",
  "keywords": ["AI", "ML"],
  "bedrock_latency_ms": 3500,
  "feeds_returned": 5,
  "fallback_used": false
}
```

### Dashboards

**CloudWatch Dashboard**:
- Bedrock invocation rate (requests/min)
- Success rate (%)
- Latency (p50, p95, p99)
- Fallback usage rate (%)
- Lambda execution metrics

## Security Considerations

### IAM Permissions

**Lambda Execution Role**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
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
      "Resource": "arn:aws:lambda:*:*:function:feed-bower-*-feed-search"
    }
  ]
}
```

**Backend Lambda Role** (add Bedrock permission):
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeAgent"
  ],
  "Resource": "arn:aws:bedrock:*:*:agent/*"
}
```

### Data Privacy

- No user PII sent to Bedrock (only keywords)
- Feed URLs are public information
- No sensitive data in Lambda logs
- Bedrock requests are encrypted in transit

## Cost Estimation

### Bedrock Agent Costs

**Claude 3 Haiku Pricing** (as of 2024):
- Input: $0.00025 per 1K tokens
- Output: $0.00125 per 1K tokens

**Estimated Usage**:
- Average request: ~100 input tokens, ~500 output tokens
- Cost per request: ~$0.00065
- 10,000 requests/month: ~$6.50/month

### Lambda Costs

**Pricing**:
- $0.20 per 1M requests
- $0.0000166667 per GB-second

**Estimated Usage**:
- 256MB memory, 1s average duration
- 10,000 invocations/month
- Cost: ~$0.50/month

**Total Estimated Cost**: ~$7/month for 10,000 recommendations

## Future Enhancements

1. **Caching Layer**: Cache Bedrock responses for common keywords
2. **User Feedback**: Allow users to rate feed recommendations
3. **Learning**: Use feedback to improve relevance scoring
4. **Multi-language**: Expand to more languages
5. **Real-time Updates**: Periodically refresh feed database
6. **A/B Testing**: Compare Bedrock vs static mapping quality
