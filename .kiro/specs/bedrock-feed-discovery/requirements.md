# Requirements Document

## Introduction

This feature integrates Amazon Bedrock Agent Core to provide AI-powered RSS/Atom feed discovery based on user-provided keywords. The system will automatically find relevant, high-quality feeds using Claude 3 Haiku model, with a fallback mechanism to static keyword mapping when Bedrock is unavailable.

## Glossary

- **Bedrock Agent**: Amazon Bedrock Agent Core service that orchestrates AI-powered feed discovery
- **Feed Service**: The backend service responsible for feed management and recommendations
- **Action Group**: A Bedrock Agent component that defines available actions (feed search)
- **Lambda Executor**: AWS Lambda function that executes the feed search action
- **Feed Database**: A curated collection of RSS/Atom feeds with metadata
- **Relevance Score**: A numerical value (0-1) indicating how well a feed matches the search keywords
- **Fallback Mechanism**: Static keyword mapping used when Bedrock Agent is unavailable

## Requirements

### Requirement 1

**User Story:** As a user, I want the system to automatically find relevant RSS feeds based on my interests, so that I can quickly discover quality content sources without manual searching.

#### Acceptance Criteria

1. WHEN a user provides keywords, THE Feed Service SHALL invoke the Bedrock Agent to search for relevant feeds
2. THE Bedrock Agent SHALL return feeds with relevance scores between 0 and 1
3. THE Feed Service SHALL return at least 1 feed and at most 10 feeds per request
4. WHEN keywords are provided in Japanese or English, THE Bedrock Agent SHALL prioritize feeds in the matching language
5. THE Feed Service SHALL complete the recommendation request within 10 seconds

### Requirement 2

**User Story:** As a system administrator, I want the feed discovery to gracefully handle Bedrock failures, so that users always receive recommendations even when the AI service is unavailable.

#### Acceptance Criteria

1. IF the Bedrock Agent invocation fails, THEN THE Feed Service SHALL automatically use the static keyword mapping fallback
2. THE Feed Service SHALL log Bedrock failures with appropriate error details
3. THE Feed Service SHALL return recommendations from the fallback mechanism within 2 seconds
4. WHEN using fallback, THE Feed Service SHALL indicate in logs that static mapping was used
5. THE Feed Service SHALL not expose Bedrock errors to the end user

### Requirement 3

**User Story:** As a developer, I want the Bedrock Agent infrastructure to be deployed via Terraform, so that the setup is reproducible and version-controlled.

#### Acceptance Criteria

1. THE Terraform module SHALL create a Bedrock Agent with Claude 3 Haiku model
2. THE Terraform module SHALL create a Lambda function for the feed search action group
3. THE Terraform module SHALL configure IAM roles with least-privilege permissions
4. THE Terraform module SHALL create a Bedrock Agent alias for production use
5. THE Terraform module SHALL output the Agent ID and Alias ID for backend configuration

### Requirement 4

**User Story:** As a system, I want to maintain a curated feed database, so that the Lambda executor can return high-quality, verified feed sources.

#### Acceptance Criteria

1. THE Feed Database SHALL contain at least 20 verified RSS/Atom feeds
2. THE Feed Database SHALL include feeds in both Japanese and English
3. THE Feed Database SHALL store metadata including title, description, category, language, and tags
4. THE Feed Database SHALL be stored as JSON within the Lambda deployment package
5. THE Feed Database SHALL be updateable without redeploying the Bedrock Agent

### Requirement 5

**User Story:** As a user, I want feed recommendations to be ranked by relevance, so that the most appropriate feeds appear first.

#### Acceptance Criteria

1. THE Lambda Executor SHALL calculate relevance scores based on keyword matches in title, description, category, and tags
2. THE Lambda Executor SHALL assign weight 0.4 for title matches, 0.3 for description matches, 0.2 for category matches, and 0.1 for tag matches
3. THE Lambda Executor SHALL reduce relevance by 30% when feed language does not match the preferred language
4. THE Lambda Executor SHALL sort results by relevance score in descending order
5. THE Lambda Executor SHALL return only feeds with relevance score greater than 0

### Requirement 6

**User Story:** As a developer, I want comprehensive logging throughout the Bedrock integration, so that I can troubleshoot issues and monitor performance.

#### Acceptance Criteria

1. THE Feed Service SHALL log when Bedrock Agent is invoked with keyword details
2. THE Feed Service SHALL log the number of recommendations received from Bedrock
3. THE Lambda Executor SHALL log all incoming requests with parameters
4. THE Lambda Executor SHALL log matching details for each feed candidate
5. THE Feed Service SHALL log response times for both Bedrock and fallback mechanisms

### Requirement 7

**User Story:** As a system administrator, I want the backend to support configuration via environment variables, so that I can deploy to different environments without code changes.

#### Acceptance Criteria

1. THE Backend SHALL read BEDROCK_AGENT_ID from environment variables
2. THE Backend SHALL read BEDROCK_AGENT_ALIAS from environment variables with default value "production"
3. THE Backend SHALL read BEDROCK_REGION from environment variables with default value "ap-northeast-1"
4. WHEN BEDROCK_AGENT_ID is empty, THE Feed Service SHALL use only the fallback mechanism
5. THE Backend SHALL validate environment variables at startup and log configuration status

### Requirement 8

**User Story:** As a developer, I want the Lambda function to validate input parameters, so that invalid requests are rejected with clear error messages.

#### Acceptance Criteria

1. THE Lambda Executor SHALL return error 400 when keywords parameter is missing
2. THE Lambda Executor SHALL return error 400 when keywords array is empty
3. THE Lambda Executor SHALL accept keywords as either array or single string
4. THE Lambda Executor SHALL validate that limit parameter is between 1 and 10
5. THE Lambda Executor SHALL validate that language parameter is either "ja" or "en"
