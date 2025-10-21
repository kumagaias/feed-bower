# Bedrock Integration Logging Implementation

## Overview

Comprehensive structured logging has been added to the Bedrock Agent integration to support monitoring, debugging, and performance analysis.

## Log Categories

### 1. Feed Recommendations Service Logs

**Location**: `back/internal/service/feed_service.go`

#### Request Lifecycle Logs

- **START**: Initial request with user_id, bower_id, keywords
- **ERROR**: Access denied, bower not found, validation errors
- **INFO**: Existing feeds count

#### Bedrock Integration Logs

- **BEDROCK_START**: Bedrock invocation initiated with keywords
- **BEDROCK_SUCCESS**: Successful response with feed count and latency
- **BEDROCK_ERROR**: Failed invocation with error details and fallback notification
- **BEDROCK_EMPTY**: No feeds returned, triggering fallback
- **BEDROCK_DISABLED**: Bedrock not configured, using fallback

#### Fallback Mechanism Logs

- **FALLBACK_START**: Static mapping initiated
- **FALLBACK_SUCCESS**: Static mapping completed with feed count and latency

#### Performance Metrics

- **PerformanceMetrics**: Structured metrics for both Bedrock and static mapping
  - Method (bedrock_agent or static_mapping)
  - Latency in milliseconds
  - Feed count
  - Success/failure status
  - Error message (if applicable)

### 2. Bedrock Client Logs

**Location**: `back/pkg/bedrock/client.go`

#### Invocation Logs

- **INVOKE_REQUEST**: Agent ID, alias, session ID, keywords
- **INVOKE_SUCCESS**: Successful invocation with latency
- **INVOKE_FAILED**: Failed invocation with error details

#### Response Processing Logs

- **CHUNK_RECEIVED**: Each chunk received with size
- **CHUNK_PARSE_ERROR**: JSON parsing errors
- **CHUNK_FEEDS_FOUND**: Number of feeds in chunk
- **FEED_PARSED**: Individual feed details (URL, title, relevance)
- **FEED_SKIPPED**: Feeds skipped due to empty URL
- **TRACE_RECEIVED**: Bedrock trace events
- **RESPONSE_COMPLETE**: Final summary with total chunks, feeds, and latencies

### 3. Bedrock Integration Service Logs

**Location**: `back/internal/service/feed_service.go` - `getFeedRecommendationsFromBedrock()`

#### Processing Logs

- **INVOKE_START**: Bedrock invocation with timeout
- **INVOKE_ERROR**: Invocation failure with latency
- **INVOKE_SUCCESS**: Raw feed count from Bedrock
- **SKIP_DUPLICATE**: Duplicate URLs filtered out
- **FEED_RECOMMENDATION**: Each feed with details (URL, title, category, relevance)
- **LIMIT_REACHED**: Maximum recommendations reached
- **CONVERSION_COMPLETE**: Summary of raw count, duplicates, final count

### 4. Static Mapping Logs

**Location**: `back/internal/service/feed_service.go` - `getStaticFeedRecommendations()`

#### Mapping Logs

- **START**: Static mapping initiated with keywords
- **KEYWORD_NO_MATCH**: Keyword not found in mapping
- **KEYWORD_MATCHED**: Keyword matched with available feeds count
- **SKIP_DUPLICATE**: Duplicate URLs filtered
- **FEED_ADDED**: Feed added with details
- **KEYWORD_LIMIT_REACHED**: Per-keyword limit reached (2 feeds)
- **TOTAL_LIMIT_REACHED**: Total limit reached (6 feeds)
- **COMPLETE**: Final summary with matched keywords, duplicates, final count

## Log Format

All logs follow a structured format for easy parsing and monitoring:

```
[Component] EVENT_TYPE | key1=value1 | key2=value2 | ...
```

### Components

- `[FeedRecommendations]` - Main recommendation service
- `[BedrockClient]` - Bedrock Agent client
- `[BedrockIntegration]` - Bedrock integration layer
- `[StaticMapping]` - Static keyword mapping fallback
- `[PerformanceMetrics]` - Performance monitoring

### Event Types

- `START` - Operation initiated
- `SUCCESS` - Operation completed successfully
- `ERROR` - Operation failed
- `INFO` - Informational message
- `COMPLETE` - Operation finished with summary

## Key Metrics Logged

### Performance Metrics

1. **Latency**
   - Bedrock invocation time
   - Response parsing time
   - Total processing time
   - Fallback processing time

2. **Feed Counts**
   - Raw feeds from Bedrock
   - Duplicate feeds filtered
   - Final recommendations returned
   - Existing feeds in bower

3. **Success Rates**
   - Bedrock success/failure
   - Fallback usage rate
   - Error types and frequencies

### Operational Metrics

1. **Request Details**
   - User ID
   - Bower ID
   - Keywords (count and values)
   - Session ID (Bedrock)

2. **Feed Details**
   - URL
   - Title
   - Category
   - Relevance score

3. **Error Information**
   - Error type
   - Error message
   - Fallback trigger reason

## Monitoring Use Cases

### 1. Performance Monitoring

Query logs for `[PerformanceMetrics]` to track:
- Average latency by method
- Success rates
- Feed count distribution

### 2. Error Tracking

Query logs for `ERROR` or `FAILED` events to identify:
- Bedrock failures
- Timeout issues
- Configuration problems

### 3. Usage Analysis

Query logs for `START` events to analyze:
- Most common keywords
- Request frequency
- User patterns

### 4. Fallback Analysis

Query logs for `FALLBACK` events to understand:
- Fallback usage rate
- Reasons for fallback
- Fallback performance

## Example Log Outputs

### Successful Bedrock Request

```
[FeedRecommendations] START | user_id=user123 | bower_id=bower456 | keywords=[AI, machine learning] | keyword_count=2
[FeedRecommendations] INFO | user_id=user123 | bower_id=bower456 | existing_feeds_count=3
[FeedRecommendations] BEDROCK_START | user_id=user123 | bower_id=bower456 | keywords=[AI, machine learning] | method=bedrock_agent
[BedrockClient] INVOKE_REQUEST | agent_id=AGENT123 | alias_id=production | session_id=session-1234567890 | keywords=[AI, machine learning] | keyword_count=2
[BedrockClient] INVOKE_SUCCESS | agent_id=AGENT123 | session_id=session-1234567890 | keywords=[AI, machine learning] | latency_ms=3500
[BedrockClient] CHUNK_RECEIVED | session_id=session-1234567890 | chunk_number=1 | chunk_size_bytes=1024
[BedrockClient] CHUNK_FEEDS_FOUND | session_id=session-1234567890 | chunk_number=1 | feed_count=5
[BedrockClient] FEED_PARSED | session_id=session-1234567890 | chunk_number=1 | feed_index=0 | url=https://example.com/feed | title=AI Blog | relevance=0.95
[BedrockClient] RESPONSE_COMPLETE | session_id=session-1234567890 | keywords=[AI, machine learning] | total_chunks=1 | total_feeds=5 | parse_latency_ms=50 | total_latency_ms=3550
[BedrockIntegration] INVOKE_SUCCESS | bower_id=bower456 | keywords=[AI, machine learning] | latency_ms=3550 | raw_feed_count=5
[BedrockIntegration] FEED_RECOMMENDATION | bower_id=bower456 | index=0 | url=https://example.com/feed | title=AI Blog | category=Technology | relevance=0.95
[BedrockIntegration] CONVERSION_COMPLETE | bower_id=bower456 | raw_count=5 | duplicate_count=0 | final_count=5
[FeedRecommendations] BEDROCK_SUCCESS | user_id=user123 | bower_id=bower456 | keywords=[AI, machine learning] | feed_count=5 | latency_ms=3550 | method=bedrock_agent
[PerformanceMetrics] method=bedrock_agent | latency_ms=3550 | feed_count=5 | status=success | error=
```

### Bedrock Error with Fallback

```
[FeedRecommendations] START | user_id=user123 | bower_id=bower456 | keywords=[programming] | keyword_count=1
[FeedRecommendations] BEDROCK_START | user_id=user123 | bower_id=bower456 | keywords=[programming] | method=bedrock_agent
[BedrockClient] INVOKE_REQUEST | agent_id=AGENT123 | alias_id=production | session_id=session-1234567891 | keywords=[programming] | keyword_count=1
[BedrockClient] INVOKE_FAILED | agent_id=AGENT123 | session_id=session-1234567891 | keywords=[programming] | latency_ms=10000 | error=context deadline exceeded
[BedrockIntegration] INVOKE_ERROR | bower_id=bower456 | keywords=[programming] | latency_ms=10000 | error=bedrock agent failed: context deadline exceeded
[FeedRecommendations] BEDROCK_ERROR | user_id=user123 | bower_id=bower456 | keywords=[programming] | latency_ms=10000 | error=bedrock agent failed: context deadline exceeded | fallback=static_mapping
[PerformanceMetrics] method=bedrock_agent | latency_ms=10000 | feed_count=0 | status=failure | error=bedrock agent failed: context deadline exceeded
[FeedRecommendations] FALLBACK_START | user_id=user123 | bower_id=bower456 | keywords=[programming] | method=static_mapping
[StaticMapping] START | bower_id=bower456 | keywords=[programming] | keyword_count=1
[StaticMapping] KEYWORD_MATCHED | bower_id=bower456 | keyword=programming | keyword_index=0 | available_feeds=2
[StaticMapping] FEED_ADDED | bower_id=bower456 | keyword=programming | feed_index=0 | url=https://dev.to/feed/tag/programming | title=Dev.to Programming | category=Programming
[StaticMapping] COMPLETE | bower_id=bower456 | total_keywords=1 | matched_keywords=1 | skipped_duplicates=0 | final_count=2
[FeedRecommendations] FALLBACK_SUCCESS | user_id=user123 | bower_id=bower456 | keywords=[programming] | feed_count=2 | latency_ms=5 | method=static_mapping
[PerformanceMetrics] method=static_mapping | latency_ms=5 | feed_count=2 | status=success | error=
```

## CloudWatch Insights Queries

### Average Latency by Method

```
fields @timestamp, method, latency_ms
| filter @message like /PerformanceMetrics/
| stats avg(latency_ms) by method
```

### Error Rate

```
fields @timestamp, error
| filter @message like /ERROR/ or @message like /FAILED/
| stats count() by error
```

### Fallback Usage

```
fields @timestamp
| filter @message like /FALLBACK_START/
| stats count()
```

### Feed Count Distribution

```
fields @timestamp, feed_count
| filter @message like /PerformanceMetrics/
| stats avg(feed_count), min(feed_count), max(feed_count) by method
```

## Requirements Coverage

This logging implementation satisfies all requirements from the specification:

- ✅ **Requirement 2.2**: Bedrock failures logged with error details
- ✅ **Requirement 2.4**: Fallback usage logged with reason
- ✅ **Requirement 6.1**: Bedrock invocations logged with keywords
- ✅ **Requirement 6.2**: Recommendation count logged
- ✅ **Requirement 6.3**: Lambda requests logged with parameters
- ✅ **Requirement 6.4**: Matching details logged for each feed
- ✅ **Requirement 6.5**: Response times logged for both Bedrock and fallback
