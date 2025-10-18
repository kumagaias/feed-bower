output "function_arn" {
  description = "Lambda 関数 ARN"
  value       = aws_lambda_function.function.arn
}

output "function_name" {
  description = "Lambda 関数名"
  value       = aws_lambda_function.function.function_name
}

output "function_invoke_arn" {
  description = "Lambda 関数 Invoke ARN"
  value       = aws_lambda_function.function.invoke_arn
}

output "function_version" {
  description = "Lambda 関数バージョン"
  value       = aws_lambda_function.function.version
}

output "role_arn" {
  description = "Lambda 実行ロール ARN"
  value       = aws_iam_role.lambda_role.arn
}

output "role_name" {
  description = "Lambda 実行ロール名"
  value       = aws_iam_role.lambda_role.name
}

output "log_group_name" {
  description = "CloudWatch Logs グループ名"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "alias_arn" {
  description = "Lambda エイリアス ARN"
  value       = var.create_alias ? aws_lambda_alias.production[0].arn : null
}
