output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.pool.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.pool.arn
}

output "user_pool_endpoint" {
  description = "Cognito User Pool エンドポイント"
  value       = aws_cognito_user_pool.pool.endpoint
}

output "client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.client.id
}

output "client_secret" {
  description = "Cognito User Pool Client Secret"
  value       = aws_cognito_user_pool_client.client.client_secret
  sensitive   = true
}

output "domain" {
  description = "Cognito User Pool Domain"
  value       = var.domain_name != null ? aws_cognito_user_pool_domain.domain[0].domain : null
}
