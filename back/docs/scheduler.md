# Feed Fetch Scheduler

## Overview

The Feed Fetch Scheduler is a scheduled task that automatically fetches articles from all RSS feeds in the database and saves them to DynamoDB. It runs periodically to keep the article database up-to-date.

## Architecture

### Components

1. **SchedulerService** (`internal/service/scheduler_service.go`)
   - Orchestrates the feed fetching process
   - Handles duplicate detection
   - Batch saves articles to DynamoDB

2. **RSSService** (`internal/service/rss_service.go`)
   - Fetches and parses RSS/Atom feeds
   - Extracts article data
   - Handles various feed formats

3. **Repositories**
   - `FeedRepository`: Retrieves feed URLs
   - `ArticleRepository`: Saves articles with duplicate checking

### Flow

```
┌─────────────────┐
│  EventBridge    │ (Triggers every hour)
│     Rule        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lambda         │ (--mode=scheduler)
│  Function       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Scheduler       │
│ Service         │
└────────┬────────┘
         │
         ├─► Get all feeds from DynamoDB
         │
         ├─► For each feed:
         │   ├─► Fetch RSS/Atom feed
         │   ├─► Parse articles
         │   ├─► Check for duplicates
         │   ├─► Batch save new articles
         │   └─► Update feed timestamp
         │
         └─► Return summary
```

## Usage

### Local Testing

Run the scheduler locally:

```bash
# Make sure DynamoDB Local is running
make dev-all

# Run the scheduler
cd back
go run cmd/lambda/main.go --mode=scheduler
```

Or use the test script:

```bash
./scripts/test-scheduler.sh
```

### AWS Lambda Deployment

The scheduler is triggered by EventBridge (CloudWatch Events):

```hcl
module "eventbridge_scheduler" {
  source = "./modules/eventbridge"

  project_name         = "feed-bower"
  environment          = "prod"
  lambda_function_arn  = module.lambda.function_arn
  lambda_function_name = module.lambda.function_name
  schedule_expression  = "rate(1 hour)"
}
```

## Configuration

### Schedule Expressions

#### Rate Expressions
- `rate(1 minute)` - Every minute (for testing)
- `rate(5 minutes)` - Every 5 minutes
- `rate(1 hour)` - Every hour (recommended)
- `rate(1 day)` - Every day

#### Cron Expressions
- `cron(0 * * * ? *)` - Every hour at minute 0
- `cron(0 */2 * * ? *)` - Every 2 hours
- `cron(0 0 * * ? *)` - Every day at midnight UTC
- `cron(0 12 * * ? *)` - Every day at noon UTC

### Environment Variables

The scheduler uses the same environment variables as the main Lambda:

- `DYNAMODB_ENDPOINT` - DynamoDB endpoint (for local testing)
- `DYNAMODB_TABLE_PREFIX` - Table name prefix
- `AWS_REGION` - AWS region (default: ap-northeast-1)

## Features

### Duplicate Detection

The scheduler checks for duplicate articles by URL before saving:

```go
// Check if article already exists by URL
existing, err := s.articleRepo.GetByURL(ctx, article.URL)
if err != nil || existing == nil {
    // Article doesn't exist, add it
    newArticles = append(newArticles, article)
}
```

### Batch Operations

Articles are saved in batches of up to 25 items (DynamoDB limit):

```go
// Batch create new articles
if err := s.articleRepo.BatchCreate(ctx, newArticles); err != nil {
    log.Printf("❌ Error saving articles: %v", err)
}
```

### Error Handling

- Individual feed failures don't stop the entire process
- Errors are logged but processing continues
- Summary statistics are provided at the end

### Rate Limiting

A small delay is added between feed fetches to avoid overwhelming external servers:

```go
// Add a small delay to avoid overwhelming external servers
time.Sleep(500 * time.Millisecond)
```

## Monitoring

### Logs

The scheduler provides detailed logging:

```
🔄 Starting scheduled feed fetch...
📡 Found 60 feeds to fetch
📥 [1/60] Fetching feed: Tech News (https://example.com/feed)
✅ Fetched 25 articles from Tech News
💾 Saving 25 new articles for feed: Tech News
...
✨ Feed fetch completed!
📊 Summary:
   - Total feeds processed: 60
   - Total articles fetched: 1500
   - New articles saved: 1200
   - Errors: 2
```

### CloudWatch Metrics

Monitor these metrics in CloudWatch:

- Lambda execution time
- Lambda errors
- DynamoDB write capacity
- DynamoDB throttling

### Alerts

Set up CloudWatch alarms for:

- Lambda execution time > 5 minutes
- Lambda error rate > 5%
- DynamoDB throttling events

## Performance

### Optimization

1. **Batch Operations**: Articles are saved in batches of 25
2. **Parallel Processing**: Could be added for large feed counts
3. **Caching**: Feed metadata is cached in DynamoDB
4. **Timeout**: Lambda timeout should be set to at least 5 minutes

### Scaling

For large numbers of feeds (>100):

1. Consider splitting into multiple Lambda invocations
2. Use SQS queue for feed processing
3. Implement parallel processing with goroutines
4. Use DynamoDB batch operations

## Testing

### Unit Tests

Test the scheduler service:

```bash
cd back
go test ./internal/service/scheduler_service_test.go -v
```

### Integration Tests

Test with real feeds:

```bash
./scripts/test-scheduler.sh
```

### Manual Testing

1. Start development environment:
   ```bash
   make dev-all
   ```

2. Create test feeds:
   ```bash
   make create-dev-bower
   ```

3. Run scheduler:
   ```bash
   cd back
   go run cmd/lambda/main.go --mode=scheduler
   ```

4. Verify articles in DynamoDB Admin:
   ```
   http://localhost:8001
   ```

## Troubleshooting

### No feeds found

```
⚠️  No feeds found to fetch
```

**Solution**: Create development data with `make create-dev-bower`

### DynamoDB connection error

```
❌ Error: failed to list feeds: ...
```

**Solution**: Ensure DynamoDB Local is running with `make dev-all`

### Feed fetch timeout

```
❌ Error fetching feed: context deadline exceeded
```

**Solution**: 
- Increase Lambda timeout
- Check network connectivity
- Verify feed URL is accessible

### Duplicate articles

The scheduler automatically skips duplicate articles by checking URLs. If you see duplicates:

1. Check the `GetByURL` implementation
2. Verify article URLs are unique
3. Check for URL normalization issues

## Future Enhancements

1. **Parallel Processing**: Process multiple feeds concurrently
2. **Smart Scheduling**: Fetch popular feeds more frequently
3. **Feed Health Monitoring**: Track feed availability and errors
4. **Incremental Updates**: Only fetch new articles since last update
5. **Content Deduplication**: Detect duplicate content across feeds
6. **Article Ranking**: Score articles by relevance and popularity
