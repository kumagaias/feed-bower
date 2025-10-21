output "ecr_repository_url" {
  description = "ECR リポジトリ URL"
  value       = module.ecr.repository_url
}

output "lambda_function_name" {
  description = "Lambda 関数名"
  value       = module.lambda.function_name
}

output "lambda_function_arn" {
  description = "Lambda 関数 ARN"
  value       = module.lambda.function_arn
}

output "api_gateway_url" {
  description = "API Gateway エンドポイント URL"
  value       = module.api_gateway.invoke_url
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = module.api_gateway.api_id
}

output "amplify_app_id" {
  description = "Amplify アプリケーション ID"
  value       = module.amplify.app_id
}

output "amplify_default_domain" {
  description = "Amplify デフォルトドメイン"
  value       = module.amplify.default_domain
}

output "amplify_branch_urls" {
  description = "Amplify ブランチ URL"
  value       = module.amplify.branch_urls
}

output "dynamodb_tables" {
  description = "DynamoDB テーブル名"
  value = {
    users          = module.dynamodb_users.table_name
    bowers         = module.dynamodb_bowers.table_name
    feeds          = module.dynamodb_feeds.table_name
    articles       = module.dynamodb_articles.table_name
    liked_articles = module.dynamodb_liked_articles.table_name
    chick_stats    = module.dynamodb_chick_stats.table_name
  }
}

output "dynamodb_table_arns" {
  description = "DynamoDB テーブル ARN"
  value = {
    users          = module.dynamodb_users.table_arn
    bowers         = module.dynamodb_bowers.table_arn
    feeds          = module.dynamodb_feeds.table_arn
    articles       = module.dynamodb_articles.table_arn
    liked_articles = module.dynamodb_liked_articles.table_arn
    chick_stats    = module.dynamodb_chick_stats.table_arn
  }
}

output "github_actions_role_arn" {
  description = "GitHub Actions 用 IAM ロール ARN"
  value       = module.github_oidc.role_arn
}

output "github_oidc_provider_arn" {
  description = "GitHub OIDC プロバイダー ARN"
  value       = module.github_oidc.oidc_provider_arn
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.cognito.client_id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = module.cognito.user_pool_arn
}

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

output "bedrock_ecr_repository_url" {
  description = "Bedrock Lambda 用 ECR リポジトリ URL"
  value       = module.ecr_bedrock_lambda.repository_url
}

output "bedrock_ecr_repository_arn" {
  description = "Bedrock Lambda 用 ECR リポジトリ ARN"
  value       = module.ecr_bedrock_lambda.repository_arn
}
