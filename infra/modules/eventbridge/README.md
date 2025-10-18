# EventBridge Module

This Terraform module creates an EventBridge (CloudWatch Events) rule to schedule Lambda function execution.

## Features

- Creates EventBridge rule with configurable schedule
- Sets up Lambda target with custom input
- Configures Lambda permissions for EventBridge invocation
- Supports both rate and cron expressions

## Usage

```hcl
module "eventbridge_scheduler" {
  source = "./modules/eventbridge"

  project_name         = "feed-bower"
  environment          = "dev"
  lambda_function_arn  = module.lambda.function_arn
  lambda_function_name = module.lambda.function_name
  schedule_expression  = "rate(1 hour)"

  tags = {
    Project = "Feed Bower"
    ManagedBy = "Terraform"
  }
}
```

## Schedule Expressions

### Rate Expressions
- `rate(1 minute)` - Every minute
- `rate(5 minutes)` - Every 5 minutes
- `rate(1 hour)` - Every hour (default)
- `rate(1 day)` - Every day

### Cron Expressions
- `cron(0 * * * ? *)` - Every hour at minute 0
- `cron(0 */2 * * ? *)` - Every 2 hours
- `cron(0 0 * * ? *)` - Every day at midnight UTC
- `cron(0 12 * * ? *)` - Every day at noon UTC

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Name of the project | string | "feed-bower" | no |
| environment | Environment name | string | - | yes |
| lambda_function_arn | ARN of the Lambda function | string | - | yes |
| lambda_function_name | Name of the Lambda function | string | - | yes |
| schedule_expression | Schedule expression | string | "rate(1 hour)" | no |
| tags | Additional tags | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| rule_arn | ARN of the EventBridge rule |
| rule_name | Name of the EventBridge rule |
| rule_id | ID of the EventBridge rule |

## Notes

- The Lambda function must be configured to handle the scheduler mode
- EventBridge passes `{"mode": "scheduler"}` as input to the Lambda
- Ensure Lambda has appropriate timeout and memory settings for feed fetching
