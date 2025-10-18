output "repository_arn" {
  description = "ECR リポジトリ ARN"
  value       = aws_ecr_repository.repository.arn
}

output "repository_url" {
  description = "ECR リポジトリ URL"
  value       = aws_ecr_repository.repository.repository_url
}

output "repository_name" {
  description = "ECR リポジトリ名"
  value       = aws_ecr_repository.repository.name
}

output "registry_id" {
  description = "ECR レジストリ ID"
  value       = aws_ecr_repository.repository.registry_id
}
