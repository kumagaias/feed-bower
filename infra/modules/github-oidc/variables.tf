variable "role_name" {
  description = "IAM ロール名"
  type        = string
}

variable "github_repository" {
  description = "GitHub リポジトリ（例: owner/repo）"
  type        = string
}

variable "branch_name" {
  description = "デプロイ対象のブランチ名"
  type        = string
}

variable "environment_name" {
  description = "GitHub Environment 名（例: production, development）"
  type        = string
}

variable "ecr_repository_arns" {
  description = "ECR リポジトリの ARN リスト"
  type        = list(string)
}

variable "lambda_function_arns" {
  description = "Lambda 関数の ARN リスト"
  type        = list(string)
}

variable "tags" {
  description = "リソースに付与するタグ"
  type        = map(string)
  default     = {}
}
