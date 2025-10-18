output "api_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.api.id
}

output "api_arn" {
  description = "API Gateway ARN"
  value       = aws_api_gateway_rest_api.api.arn
}

output "api_execution_arn" {
  description = "API Gateway Execution ARN"
  value       = aws_api_gateway_rest_api.api.execution_arn
}

output "stage_name" {
  description = "ステージ名"
  value       = aws_api_gateway_stage.stage.stage_name
}

output "stage_arn" {
  description = "ステージ ARN"
  value       = aws_api_gateway_stage.stage.arn
}

output "invoke_url" {
  description = "API Gateway Invoke URL"
  value       = aws_api_gateway_stage.stage.invoke_url
}

output "custom_domain_name" {
  description = "カスタムドメイン名"
  value       = var.custom_domain_name != null ? aws_api_gateway_domain_name.domain[0].domain_name : null
}

output "custom_domain_cloudfront_domain_name" {
  description = "カスタムドメインの CloudFront ドメイン名"
  value       = var.custom_domain_name != null ? aws_api_gateway_domain_name.domain[0].cloudfront_domain_name : null
}

output "log_group_name" {
  description = "CloudWatch Logs グループ名"
  value       = aws_cloudwatch_log_group.api_logs.name
}
