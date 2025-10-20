# Feed Search Lambda Function

This Lambda function is used by the Bedrock Agent to search for relevant RSS/Atom feeds based on user keywords.

## Files

- `index.js` - Main Lambda handler
- `feed-database.json` - Curated database of 25+ RSS/Atom feeds
- `test.js` - Test suite for local testing
- `package.json` - Node.js package configuration

## Features

### Relevance Scoring Algorithm

The function calculates relevance scores based on keyword matches with the following weights:

- **Title match**: 0.4 (40%)
- **Description match**: 0.3 (30%)
- **Category match**: 0.2 (20%)
- **Tag match**: 0.1 (10%)

**Language penalty**: If the feed language doesn't match the preferred language, the relevance score is reduced by 30%.

### Input Validation

The function validates:

- `keywords`: Required, must be non-empty array or string
- `limit`: Optional, must be between 1 and 10 (default: 5)
- `language`: Optional, must be "ja" or "en"

### Error Handling

- Returns 400 for invalid input parameters
- Returns 500 for internal errors
- Logs all requests and matching details

## Testing Locally

Run the test suite:

```bash
node test.js
```

This will run 8 test cases covering:
- Valid keyword searches (English and Japanese)
- Single keyword as string
- Language filtering
- Input validation errors

## Feed Database

The `feed-database.json` contains 25 curated feeds covering:

- Technology news (TechCrunch, The Verge, GIGAZINE, ITmedia)
- Programming (DEV Community, Qiita, Zenn)
- Cloud platforms (AWS, Google Cloud)
- AI research (arXiv, Google AI, OpenAI)
- AI development (TensorFlow, PyTorch)
- Data science (Kaggle, Towards Data Science, KDnuggets)

Each feed includes:
- `url`: Feed URL
- `title`: Feed title
- `description`: Feed description
- `category`: Feed category
- `language`: "ja" or "en"
- `tags`: Array of relevant tags
- `lastUpdated`: Last update timestamp

## Response Format

Success response (200):
```json
{
  "feeds": [
    {
      "url": "https://example.com/feed.xml",
      "title": "Example Feed",
      "description": "Feed description",
      "category": "Technology",
      "relevance": 0.85
    }
  ],
  "total": 1
}
```

Error response (400):
```json
{
  "error": "Invalid input parameters",
  "details": ["keywords parameter is required"]
}
```

## Deployment

This function will be deployed by Terraform as part of the Bedrock Agent module.

## Requirements Met

This implementation satisfies the following requirements:

- **1.1, 1.2, 1.3**: Returns 1-10 feeds with relevance scores (0-1)
- **4.1, 4.2, 4.3**: 25+ feeds with metadata in JSON format
- **5.1, 5.2, 5.3, 5.4**: Relevance scoring with proper weights and sorting
- **8.1, 8.2, 8.3, 8.4, 8.5**: Input validation for all parameters
