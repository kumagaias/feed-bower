variable "aws_region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "github_repository" {
  description = "GitHub リポジトリ (例: username/feed-bower)"
  type        = string
}

variable "github_repository_url" {
  description = "GitHub リポジトリ URL (例: https://github.com/username/feed-bower)"
  type        = string
}

variable "github_token" {
  description = "GitHub Personal Access Token (Amplify 連携用)"
  type        = string
  sensitive   = true
}
