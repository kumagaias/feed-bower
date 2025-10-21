# Bower Auto-Register Feeds Feature

## Overview

This feature allows users to automatically register recommended feeds when creating a new Bower. Instead of manually adding feeds one by one, users can enable auto-registration to have the system automatically add relevant feeds based on the Bower's keywords.

## API Changes

### Create Bower Endpoint

**Endpoint**: `POST /api/bowers`

**New Request Fields**:
- `auto_register_feeds` (boolean, optional): Enable automatic feed registration
- `max_auto_feeds` (integer, optional): Maximum number of feeds to auto-register (1-10, default: 5)

**Request Example**:
```json
{
  "name": "My AI Bower",
  "keywords": ["AI", "machine learning"],
  "auto_register_feeds": true,
  "max_auto_feeds": 5
}
```

**Response Example**:
```json
{
  "bower": {
    "bower_id": "bower-123",
    "name": "My AI Bower",
    "keywords": ["AI", "machine learning"],
    "created_at": 1234567890,
    "updated_at": 1234567890,
    "feeds": []
  },
  "auto_registered_feeds": 4,
  "auto_register_errors": []
}
```

**Response Fields**:
- `bower`: The created Bower object
- `auto_registered_feeds`: Number of feeds successfully auto-registered
- `auto_register_errors`: Array of error messages (if any)

## Implementation Details

### Service Layer

#### BowerService Changes

**New Return Type**: `CreateBowerResult`
```go
type CreateBowerResult struct {
    Bower                *model.Bower
    AutoRegisteredFeeds  int
    AutoRegisterErrors   []string
}
```

**Updated Method Signature**:
```go
func CreateBower(ctx context.Context, userID string, req *CreateBowerRequest) (*CreateBowerResult, error)
```

**Auto-Registration Flow**:
1. Create the Bower
2. If `auto_register_feeds` is true:
   - Call `FeedService.AutoRegisterFeeds()` with the Bower's keywords
   - Limit to `max_auto_feeds` (default: 5)
   - Handle errors non-blocking (Bower creation succeeds even if auto-registration fails)
3. Return result with auto-registration statistics

### Circular Dependency Resolution

To avoid circular dependency between `BowerService` and `FeedService`:

1. `BowerService` has an optional `FeedService` field
2. `SetFeedService()` method is called during initialization
3. Auto-registration only works if `FeedService` is set

**Initialization in main.go**:
```go
bowerService := service.NewBowerService(bowerRepo, feedRepo)
feedService := service.NewFeedService(feedRepo, bowerRepo, rssService, feedServiceConfig)

// Link services to enable auto-registration
if bs, ok := bowerService.(interface{ SetFeedService(service.FeedService) }); ok {
    bs.SetFeedService(feedService)
}
```

## Error Handling

### Non-Blocking Errors

Auto-registration errors do NOT fail the Bower creation:
- Bower is created successfully
- Errors are logged and returned in `auto_register_errors` field
- User can manually add feeds later

### Error Types

1. **Feed Service Not Configured**: Auto-registration is skipped
2. **Bedrock/Recommendation Errors**: Falls back to static mapping
3. **Feed Validation Errors**: Individual feeds are skipped, others continue
4. **Feed Fetch Errors**: Individual feeds are skipped, others continue

## Logging

All auto-registration operations are logged with structured logging:

```
[CreateBower] AUTO_REGISTER_START | user_id=user123 | bower_id=bower123 | keywords=[AI, ML] | max_feeds=5
[CreateBower] AUTO_REGISTER_SUCCESS | user_id=user123 | bower_id=bower123 | added=4 | skipped=1 | failed=0
[CreateBower] AUTO_REGISTER_ERROR | user_id=user123 | bower_id=bower123 | error=...
```

## Testing

### Unit Tests

Updated tests in `bower_service_unit_test.go`:
- Tests now expect `CreateBowerResult` instead of `*model.Bower`
- Verify `auto_registered_feeds` field is 0 when not requested

### Integration Tests

Updated tests in `integration_test.go`:
- Tests now handle `CreateBowerResult` return type
- Extract `bower` from result for further assertions

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **10.1**: Bower Service provides option to auto-add feeds based on keywords
- **10.2**: Auto-registration executes after Bower creation when flag is true
- **10.3**: Maximum number of auto-registered feeds is limited (default 5)
- **10.4**: Bower creation succeeds even if auto-registration fails
- **10.5**: Response includes count of auto-registered feeds

## Usage Example

### Frontend Integration

```typescript
// Create Bower with auto-registration
const response = await fetch('/api/bowers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My AI Bower',
    keywords: ['AI', 'machine learning'],
    auto_register_feeds: true,
    max_auto_feeds: 5
  })
});

const result = await response.json();
console.log(`Bower created with ${result.auto_registered_feeds} feeds`);

if (result.auto_register_errors.length > 0) {
  console.warn('Some feeds failed to register:', result.auto_register_errors);
}
```

## Future Enhancements

1. **Retry Logic**: Retry failed feed registrations
2. **Background Processing**: Move auto-registration to background job for large numbers
3. **User Preferences**: Save user's preferred `max_auto_feeds` setting
4. **Feed Quality Scoring**: Prioritize higher quality feeds
5. **Duplicate Detection**: More sophisticated duplicate detection across Bowers
