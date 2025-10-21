# 設計書

## 概要

この設計書は、AI駆動のRSS/Atomフィード検索を提供するために、Amazon Bedrock Agent CoreをFeed Bowerに統合するための技術アーキテクチャを概説します。システムはClaude 3 Haikuを使用してユーザーのキーワードと厳選されたフィードデータベースをインテリジェントにマッチングし、信頼性のために静的キーワードマッピングへのフォールバックを備えています。

## アーキテクチャ

### 高レベルアーキテクチャ

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


## 新機能: フィード自動登録

### 3. Feed Auto-Registration Service

**Location**: `back/internal/service/feed_service.go`

**New Method**:
```go
func (s *feedService) AutoRegisterFeeds(ctx context.Context, userID string, bowerID string, keywords []string, maxFeeds int) (*AutoRegisterResult, error)
```

**Responsibilities**:
- キーワードからフィード推奨を取得
- 各推奨フィードのURLを検証
- 既存フィードとの重複をチェック
- 有効なフィードをBowerに自動追加
- 結果サマリーを返す

**Data Structure**:
```go
type AutoRegisterResult struct {
    AddedFeeds    []*model.Feed  // 追加されたフィード
    SkippedFeeds  []string       // スキップされたフィードURL（重複）
    FailedFeeds   []FailedFeed   // 失敗したフィード
    TotalAdded    int            // 追加された総数
    TotalSkipped  int            // スキップされた総数
    TotalFailed   int            // 失敗した総数
}

type FailedFeed struct {
    URL    string
    Reason string
}
```

### 4. Bower Service Integration

**Location**: `back/internal/service/bower_service.go`

**Updated Method**:
```go
type CreateBowerRequest struct {
    Name              string   `json:"name"`
    Keywords          []string `json:"keywords"`
    AutoRegisterFeeds bool     `json:"auto_register_feeds"` // 新規追加
    MaxAutoFeeds      int      `json:"max_auto_feeds"`      // 新規追加（デフォルト5）
}

func (s *bowerService) CreateBower(ctx context.Context, userID string, req *CreateBowerRequest) (*CreateBowerResult, error)
```

**Updated Response**:
```go
type CreateBowerResult struct {
    Bower              *model.Bower
    AutoRegisteredFeeds int              // 自動登録されたフィード数
    AutoRegisterErrors  []string         // 自動登録エラー（あれば）
}
```

### 5. API Endpoints

#### 5.1 フィード自動登録エンドポイント

**Endpoint**: `POST /api/feeds/auto-register`

**Request**:
```json
{
  "bower_id": "bower-123",
  "keywords": ["AI", "machine learning"],
  "max_feeds": 5
}
```

**Response**:
```json
{
  "added_feeds": [
    {
      "feed_id": "feed-1",
      "url": "https://ai.googleblog.com/feeds/posts/default",
      "title": "Google AI Blog",
      "description": "Latest AI research",
      "category": "AI Research"
    }
  ],
  "skipped_feeds": [
    "https://existing-feed.com/rss"
  ],
  "failed_feeds": [
    {
      "url": "https://invalid-feed.com/rss",
      "reason": "Invalid RSS format"
    }
  ],
  "summary": {
    "total_added": 4,
    "total_skipped": 1,
    "total_failed": 1
  }
}
```

#### 5.2 Bower作成エンドポイント（更新）

**Endpoint**: `POST /api/bowers`

**Request**:
```json
{
  "name": "My AI Bower",
  "keywords": ["AI", "machine learning"],
  "auto_register_feeds": true,
  "max_auto_feeds": 5
}
```

**Response**:
```json
{
  "bower": {
    "bower_id": "bower-123",
    "name": "My AI Bower",
    "keywords": ["AI", "machine learning"],
    "created_at": 1234567890
  },
  "auto_registered_feeds": 4,
  "auto_register_errors": []
}
```

## フロー図

### フィード自動登録フロー

```
User Request
    │
    ▼
┌─────────────────────────────────────┐
│ POST /api/feeds/auto-register       │
│ - bower_id                          │
│ - keywords                          │
│ - max_feeds                         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Feed Service                        │
│ AutoRegisterFeeds()                 │
└────────────┬────────────────────────┘
             │
             ├─────────────────────────┐
             │                         │
             ▼                         ▼
┌──────────────────────┐    ┌──────────────────────┐
│ 1. Get Recommendations│    │ 2. Get Existing Feeds│
│    (Bedrock/Fallback) │    │    (Check Duplicates)│
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           └───────────┬───────────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │ 3. For Each Feed:     │
           │  - Validate URL       │
           │  - Check Duplicate    │
           │  - Fetch Feed Info    │
           │  - Add to Bower       │
           └───────────┬───────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │ 4. Return Summary     │
           │  - Added: 4           │
           │  - Skipped: 1         │
           │  - Failed: 1          │
           └───────────────────────┘
```

### Bower作成時の自動登録フロー

```
User Request
    │
    ▼
┌─────────────────────────────────────┐
│ POST /api/bowers                    │
│ - name                              │
│ - keywords                          │
│ - auto_register_feeds: true         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Bower Service                       │
│ CreateBower()                       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 1. Create Bower                     │
│    - Validate keywords              │
│    - Save to DynamoDB               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. If auto_register_feeds == true  │
│    Call Feed Service                │
│    AutoRegisterFeeds()              │
└────────────┬────────────────────────┘
             │
             ├─── Success ────┐
             │                │
             ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│ Return Bower +   │  │ Log Errors       │
│ Feed Count       │  │ (Non-blocking)   │
└──────────────────┘  └──────────────────┘
```

## エラーハンドリング

### フィード自動登録のエラー

1. **Bower Not Found**: 404エラーを返す
2. **Access Denied**: 403エラーを返す（Bowerの所有者でない）
3. **Invalid Feed URL**: スキップして次のフィードへ（failed_feedsに記録）
4. **Feed Fetch Error**: スキップして次のフィードへ（failed_feedsに記録）
5. **Duplicate Feed**: スキップして次のフィードへ（skipped_feedsに記録）
6. **Bedrock Error**: フォールバックを使用（既存の動作）

### Bower作成時の自動登録エラー

- **原則**: フィード自動登録の失敗はBower作成を失敗させない
- **動作**: エラーをログに記録し、`auto_register_errors`に含める
- **ユーザー体験**: Bowerは作成され、後で手動でフィードを追加可能

## パフォーマンス考慮事項

### 並列処理

フィード検証と追加を並列化して高速化：

```go
// 並列でフィードを検証・追加
var wg sync.WaitGroup
results := make(chan FeedResult, len(recommendations))

for _, rec := range recommendations {
    wg.Add(1)
    go func(feed FeedRecommendation) {
        defer wg.Done()
        // Validate and add feed
        result := s.validateAndAddFeed(ctx, bowerID, feed)
        results <- result
    }(rec)
}

wg.Wait()
close(results)
```

### タイムアウト

- 各フィード検証: 5秒
- 全体のタイムアウト: 30秒
- Bedrock呼び出し: 10秒（既存）

### レート制限

- 最大同時フィード検証: 5件
- フィード追加間の遅延: 100ms

## セキュリティ

### 認証・認可

1. ユーザー認証が必要（既存のAuth middleware）
2. Bower所有者のみが自動登録可能
3. フィードURL検証（既存のValidateFeedURL）

### 入力検証

1. `max_feeds`: 1-10の範囲
2. `keywords`: 1-8個の範囲（既存）
3. `bower_id`: 必須、存在確認

## テスト戦略

### ユニットテスト

1. `AutoRegisterFeeds()` - 正常系、エラー系
2. `CreateBower()` with auto_register - 正常系、エラー系
3. フィード検証ロジック
4. 重複チェックロジック

### 統合テスト

1. Bedrock → 自動登録の完全フロー
2. フォールバック → 自動登録の完全フロー
3. Bower作成 → 自動登録の完全フロー

## Bedrockの現在の制限

**重要**: 現在のBedrock実装は**静的なフィードデータベース（25件）から検索**しています。

### 現在の動作

1. Lambda関数が`feed-database.json`を読み込み
2. キーワードに基づいて関連度スコアを計算
3. 既存の25件のフィードから最適なものを返す

### 制限事項

- ❌ 新しいフィードを自動的に発見しない
- ❌ インターネット上のフィードを検索しない
- ✅ 厳選された高品質なフィードのみを推奨

### 将来の拡張

フィードデータベースを拡張する方法：
1. `feed-database.json`に新しいフィードを追加
2. Lambda関数を再デプロイ
3. または、外部フィード検索APIを統合（将来の機能）
