output "lambda_function_arn" {
  description = "Lambda 関数 ARN"
  value       = aws_lambda_function.feed_search.arn
}

output "lambda_function_name" {
  description = "Lambda 関数名"
  value       = aws_lambda_function.feed_search.function_name
}

output "lambda_role_arn" {
  description = "Lambda 実行ロール ARN"
  value       = aws_iam_role.lambda_role.arn
}

output "lambda_log_group_name" {
  description = "CloudWatch Logs グループ名"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}
