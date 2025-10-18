output "app_id" {
  description = "Amplify アプリケーション ID"
  value       = aws_amplify_app.app.id
}

output "app_arn" {
  description = "Amplify アプリケーション ARN"
  value       = aws_amplify_app.app.arn
}

output "default_domain" {
  description = "Amplify デフォルトドメイン"
  value       = aws_amplify_app.app.default_domain
}

output "branch_urls" {
  description = "ブランチごとの URL"
  value = {
    for branch_name, branch in aws_amplify_branch.branches :
    branch_name => "https://${branch.branch_name}.${aws_amplify_app.app.default_domain}"
  }
}

output "custom_domain" {
  description = "カスタムドメイン名"
  value       = var.custom_domain != null ? aws_amplify_domain_association.domain[0].domain_name : null
}

output "webhook_urls" {
  description = "Webhook URL"
  value = {
    for name, webhook in aws_amplify_webhook.webhook :
    name => webhook.url
  }
  sensitive = true
}

output "service_role_arn" {
  description = "Amplify サービスロール ARN"
  value       = var.iam_service_role_arn != null ? var.iam_service_role_arn : aws_iam_role.amplify[0].arn
}
