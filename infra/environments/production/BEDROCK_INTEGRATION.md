# Bedrock Agent Integration - Production Environment

## Overview

This document describes the Bedrock Agent integration added to the production environment for AI-powered RSS/Atom feed discovery.

## Changes Made

### 1. Added Bedrock Agent Module

**File**: `infra/environments/production/main.tf`

Added the `bedrock_agent` module to create:
- Bedrock Agent with Claude 3 Haiku model
- Lambda function for feed search execution
- Action Group for feed search API
- IAM roles and permissions
- CloudWatch log groups

```hcl
module "bedrock_agent" {
  source = "../../modules/bedrock-agent"

  environment        = local.environment
  project_name       = local.project_name
  image_uri          = "${module.ecr.repository_url}:latest"
  lambda_timeout     = 30
  lambda_memory      = 256
  log_retention_days = 30

  tags = local.common_tags

  depends_on = [module.ecr]
}
```

### 2. Updated Lambda Environment Variables

**File**: `infra/environments/production/main.tf`

Added Bedrock Agent configuration to the main Lambda function:

```hcl
environment_variables = {
  # ... existing variables ...
  BEDROCK_AGENT_ID      = module.bedrock_agent.bedrock_agent_id
  BEDROCK_AGENT_ALIAS   = "production"
  BEDROCK_REGION        = "ap-northeast-1"
}
```

### 3. Enhanced Lambda IAM Permissions

**File**: `infra/modules/lambda/main.tf`

Added `bedrock-agent-runtime:InvokeAgent` permission to the Lambda execution role:

```hcl
{
  Effect = "Allow"
  Action = [
    "bedrock-agent-runtime:InvokeAgent"
  ]
  Resource = "arn:aws:bedrock:*:*:agent/*"
}
```

### 4. Added Outputs

**File**: `infra/environments/production/outputs.tf`

Added outputs for Bedrock Agent resources:

```hcl
output "bedrock_agent_id" {
  description = "Bedrock Agent ID"
  value       = module.bedrock_agent.bedrock_agent_id
}

output "bedrock_agent_alias_id" {
  description = "Bedrock Agent Alias ID (production)"
  value       = module.bedrock_agent.bedrock_agent_alias_id
}

output "bedrock_agent_arn" {
  description = "Bedrock Agent ARN"
  value       = module.bedrock_agent.bedrock_agent_arn
}

output "bedrock_lambda_function_name" {
  description = "Bedrock Lambda 関数名"
  value       = module.bedrock_agent.lambda_function_name
}
```

## Resources to be Created

When `terraform apply` is executed, the following resources will be created:

1. **Bedrock Agent**: `feed-bower-production-agent`
   - Model: Claude 3 Haiku (`anthropic.claude-3-haiku-20240307-v1:0`)
   - Region: ap-northeast-1
   - Idle session TTL: 600 seconds

2. **Lambda Function**: `feed-bower-production-feed-search`
   - Runtime: Container image from ECR
   - Memory: 256 MB
   - Timeout: 30 seconds
   - Purpose: Execute feed search based on keywords

3. **Action Group**: `feed-search`
   - API Schema: OpenAPI 3.0 specification
   - Executor: Lambda function
   - Operations: POST /search-feeds

4. **IAM Roles**:
   - Lambda execution role with CloudWatch Logs permissions
   - Bedrock Agent role with Lambda invoke and model invoke permissions

5. **CloudWatch Log Groups**:
   - `/aws/lambda/feed-bower-production-feed-search` (30 days retention)

6. **Bedrock Agent Alias**: `production`
   - Points to the DRAFT version of the agent

## Terraform Plan Summary

```
Plan: 12 to add, 3 to change, 0 to destroy.

Changes to Outputs:
  + bedrock_agent_alias_id       = (known after apply)
  + bedrock_agent_arn            = (known after apply)
  + bedrock_agent_id             = (known after apply)
  + bedrock_lambda_function_name = "feed-bower-production-feed-search"
```

## Next Steps

### To Apply Changes:

1. **Acquire state lock** (if needed):
   ```bash
   cd infra/environments/production
   terraform force-unlock <LOCK_ID>
   ```

2. **Apply the changes**:
   ```bash
   terraform apply
   ```

3. **Verify outputs**:
   ```bash
   terraform output bedrock_agent_id
   terraform output bedrock_agent_alias_id
   ```

### To Test Bedrock Agent:

1. **Direct test via AWS CLI**:
   ```bash
   aws bedrock-agent-runtime invoke-agent \
     --agent-id $(terraform output -raw bedrock_agent_id) \
     --agent-alias-id $(terraform output -raw bedrock_agent_alias_id) \
     --session-id test-$(date +%s) \
     --input-text "Find feeds for: AI, machine learning" \
     --region ap-northeast-1
   ```

2. **Test through API** (after backend deployment):
   ```bash
   curl -X POST "https://api.feed-bower.net/api/feeds/recommendations" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "bower_id": "test-bower",
       "keywords": ["AI", "machine learning"]
     }'
   ```

### To Monitor:

1. **CloudWatch Logs**:
   - Lambda: `/aws/lambda/feed-bower-production-feed-search`
   - Main API: `/aws/lambda/feed-bower-api-production`

2. **CloudWatch Metrics**:
   - Lambda invocations
   - Lambda errors
   - Lambda duration

## Configuration

The backend will automatically use the Bedrock Agent when the following environment variables are set:

- `BEDROCK_AGENT_ID`: Agent ID (from Terraform output)
- `BEDROCK_AGENT_ALIAS`: "production"
- `BEDROCK_REGION`: "ap-northeast-1"

If `BEDROCK_AGENT_ID` is empty or the agent fails, the system will automatically fall back to static keyword mapping.

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **3.1**: Terraform module creates Bedrock Agent with Claude 3 Haiku
- **3.2**: Terraform module creates Lambda function for feed search action group
- **7.1**: Backend reads BEDROCK_AGENT_ID from environment variables
- **7.2**: Backend reads BEDROCK_AGENT_ALIAS with default "production"
- **7.3**: Backend reads BEDROCK_REGION with default "ap-northeast-1"

## Notes

- The Lambda function uses the same ECR image as the main API Lambda
- The feed database is embedded in the Lambda deployment package
- IAM permissions follow the principle of least privilege
- All resources are tagged with Environment and Project tags
- The Bedrock Agent is configured for the ap-northeast-1 region
