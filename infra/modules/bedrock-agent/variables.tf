variable "environment" {
  description = "環境名 (dev, staging, production)"
  type        = string
}

variable "project_name" {
  description = "プロジェクト名"
  type        = string
  default     = "feed-bower"
}

variable "image_uri" {
  description = "ECR イメージ URI"
  type        = string
}

variable "lambda_timeout" {
  description = "Lambda 関数タイムアウト (秒)"
  type        = number
  default     = 30
}

variable "lambda_memory" {
  description = "Lambda 関数メモリ (MB)"
  type        = number
  default     = 256
}

variable "log_retention_days" {
  description = "CloudWatch Logs 保持期間 (日)"
  type        = number
  default     = 7
}

variable "tags" {
  description = "リソースタグ"
  type        = map(string)
  default     = {}
}
