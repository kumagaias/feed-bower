variable "function_name" {
  description = "Lambda 関数名"
  type        = string
}

variable "image_uri" {
  description = "ECR イメージ URI"
  type        = string
}

variable "memory_size" {
  description = "Lambda メモリサイズ (MB)"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Lambda タイムアウト (秒)"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "環境変数"
  type        = map(string)
  default     = {}
}

variable "vpc_config" {
  description = "VPC 設定"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

variable "dynamodb_table_arns" {
  description = "DynamoDB テーブル ARN のリスト"
  type        = list(string)
  default     = []
}

variable "enable_bedrock" {
  description = "Bedrock アクセスを有効化"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch Logs 保持期間 (日)"
  type        = number
  default     = 7
}

variable "create_alias" {
  description = "production エイリアスを作成"
  type        = bool
  default     = false
}

variable "provisioned_concurrent_executions" {
  description = "Provisioned Concurrency の実行数"
  type        = number
  default     = 0
}

variable "tags" {
  description = "リソースタグ"
  type        = map(string)
  default     = {}
}
