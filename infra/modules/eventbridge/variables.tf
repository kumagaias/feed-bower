# EventBridge module variables

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "feed-bower"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "lambda_function_arn" {
  description = "ARN of the Lambda function to invoke"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "schedule_expression" {
  description = "Schedule expression for EventBridge rule (e.g., 'rate(1 hour)' or 'cron(0 * * * ? *)')"
  type        = string
  default     = "rate(1 hour)"
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
