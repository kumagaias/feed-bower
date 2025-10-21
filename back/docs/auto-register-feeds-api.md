# Auto-Register Feeds API

## Endpoint

`POST /api/feeds/auto-register`

## Description

Automatically registers recommended feeds to a bower based on keywords. This endpoint:
1. Gets feed recommendations based on the provided keywords (using Bedrock or fallback)
2. Validates each recommended feed URL
3. Checks for duplicates against existing feeds in the bower
4. Adds valid, non-duplicate feeds to the bower
5. Returns a summary of added, skipped, and failed feeds

## Authentication

Requires authentication. User must be the owner of the bower.

## Request

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Body
```json
{
  "bower_id": "bower-123",
  "keywords": ["AI", "machine learning"],
  "max_feeds": 5
}
```

### Parameters

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| bower_id | string | Yes | - | ID of the bower to add feeds to |
| keywords | array[string] | Yes | min=1 | Keywords to search for feed recommendations |
| max_feeds | integer | Yes | min=1, max=10 | Maximum number of feeds to auto-register |

## Response

### Success (200 OK)

```json
{
  "added_feeds": [
    {
      "feed_id": "feed-1",
      "bower_id": "bower-123",
      "url": "https://ai.googleblog.com/feeds/posts/default",
      "title": "Google AI Blog",
      "description": "Latest AI research and updates",
      "category": "AI Research",
      "last_updated": 1234567890,
      "created_at": 1234567890
    },
    {
      "feed_id": "feed-2",
      "bower_id": "bower-123",
      "url": "https://openai.com/blog/rss/",
      "title": "OpenAI Blog",
      "description": "Research and updates from OpenAI",
      "category": "AI Research",
      "last_updated": 1234567890,
      "created_at": 1234567890
    }
  ],
  "skipped_feeds": [
    "https://existing-feed.com/rss"
  ],
  "failed_feeds": [
    {
      "url": "https://invalid-feed.com/rss",
      "reason": "invalid feed URL: failed to fetch feed"
    }
  ],
  "summary": {
    "total_added": 2,
    "total_skipped": 1,
    "total_failed": 1
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation error: max_feeds must be between 1 and 10"
}
```

#### 403 Forbidden
```json
{
  "error": "access denied: not bower owner"
}
```

#### 404 Not Found
```json
{
  "error": "bower not found"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to auto-register feeds: <error details>"
}
```

## Example Usage

### Using curl

```bash
# Get authentication token first
TOKEN="your-auth-token"

# Auto-register feeds
curl -X POST "http://localhost:8080/api/feeds/auto-register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bower_id": "bower-123",
    "keywords": ["AI", "machine learning", "deep learning"],
    "max_feeds": 5
  }'
```

### Using JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:8080/api/feeds/auto-register', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bower_id: 'bower-123',
    keywords: ['AI', 'machine learning', 'deep learning'],
    max_feeds: 5
  })
});

const result = await response.json();
console.log(`Added ${result.summary.total_added} feeds`);
console.log(`Skipped ${result.summary.total_skipped} feeds`);
console.log(`Failed ${result.summary.total_failed} feeds`);
```

## Behavior

### Parallel Processing
- Feeds are validated and added in parallel with a concurrency limit of 5
- Each feed validation has a 5-second timeout
- The entire operation has a 30-second timeout

### Duplicate Detection
- Feeds with URLs that already exist in the bower are skipped
- Skipped feeds are reported in the `skipped_feeds` array

### Validation
- Each feed URL is validated before being added
- The feed is fetched to verify it's a valid RSS/Atom feed
- Invalid feeds are reported in the `failed_feeds` array with a reason

### Error Handling
- Feed validation/addition errors are non-blocking
- Failed feeds don't prevent other feeds from being added
- All results (success, skipped, failed) are reported in the response

## Notes

- The endpoint uses the same feed recommendation logic as `/api/feeds/recommendations`
- Recommendations come from Bedrock Agent (if configured) or fallback to static mapping
- A small delay (100ms) is added between feed additions to avoid overwhelming external services
- The user must be authenticated and must own the bower to use this endpoint
