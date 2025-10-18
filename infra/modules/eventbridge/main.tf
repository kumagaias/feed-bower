# EventBridge module for scheduling Lambda functions

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# EventBridge Rule for scheduled feed fetching
resource "aws_cloudwatch_event_rule" "feed_fetch_schedule" {
  name                = "${var.project_name}-feed-fetch-schedule-${var.environment}"
  description         = "Trigger Lambda to fetch RSS feeds every hour"
  schedule_expression = var.schedule_expression

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-feed-fetch-schedule-${var.environment}"
      Environment = var.environment
    }
  )
}

# EventBridge Target - Lambda Function
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.feed_fetch_schedule.name
  target_id = "FeedFetchLambda"
  arn       = var.lambda_function_arn

  # Pass scheduler mode flag to Lambda
  input = jsonencode({
    mode = "scheduler"
  })
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.feed_fetch_schedule.arn
}
