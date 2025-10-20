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

output "bedrock_agent_id" {
  description = "Bedrock Agent ID"
  value       = aws_bedrockagent_agent.feed_bower_agent.agent_id
}

output "bedrock_agent_arn" {
  description = "Bedrock Agent ARN"
  value       = aws_bedrockagent_agent.feed_bower_agent.agent_arn
}

output "bedrock_agent_alias_id" {
  description = "Bedrock Agent Alias ID (production)"
  value       = aws_bedrockagent_agent_alias.production.agent_alias_id
}

output "bedrock_agent_alias_arn" {
  description = "Bedrock Agent Alias ARN (production)"
  value       = aws_bedrockagent_agent_alias.production.agent_alias_arn
}

output "bedrock_agent_role_arn" {
  description = "Bedrock Agent IAM ロール ARN"
  value       = aws_iam_role.bedrock_agent_role.arn
}
