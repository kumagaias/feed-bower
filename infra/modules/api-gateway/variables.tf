variable "api_name" {
  description = "API Gateway 名"
  type        = string
}

variable "api_description" {
  description = "API の説明"
  type        = string
  default     = ""
}

variable "stage_name" {
  description = "ステージ名"
  type        = string
  default     = "prod"
}

variable "endpoint_type" {
  description = "エンドポイントタイプ (REGIONAL, EDGE, PRIVATE)"
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "EDGE", "PRIVATE"], var.endpoint_type)
    error_message = "endpoint_type は REGIONAL, EDGE, PRIVATE のいずれかである必要があります。"
  }
}

variable "lambda_invoke_arn" {
  description = "Lambda 関数の Invoke ARN"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda 関数名"
  type        = string
}

variable "enable_cors" {
  description = "CORS を有効化"
  type        = bool
  default     = true
}

variable "cors_allow_origins" {
  description = "CORS 許可オリジン"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allow_methods" {
  description = "CORS 許可メソッド"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}

variable "cors_allow_headers" {
  description = "CORS 許可ヘッダー"
  type        = list(string)
  default     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
}

variable "logging_level" {
  description = "ログレベル (OFF, ERROR, INFO)"
  type        = string
  default     = "INFO"

  validation {
    condition     = contains(["OFF", "ERROR", "INFO"], var.logging_level)
    error_message = "logging_level は OFF, ERROR, INFO のいずれかである必要があります。"
  }
}

variable "data_trace_enabled" {
  description = "データトレースを有効化"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch Logs 保持期間 (日)"
  type        = number
  default     = 7
}

variable "xray_tracing_enabled" {
  description = "X-Ray トレーシングを有効化"
  type        = bool
  default     = false
}

variable "throttling_burst_limit" {
  description = "バーストリミット（リクエスト数）"
  type        = number
  default     = 5000
}

variable "throttling_rate_limit" {
  description = "レートリミット（リクエスト/秒）"
  type        = number
  default     = 10000
}

variable "caching_enabled" {
  description = "キャッシングを有効化"
  type        = bool
  default     = false
}

variable "cache_ttl_in_seconds" {
  description = "キャッシュ TTL（秒）"
  type        = number
  default     = 300
}

variable "custom_domain_name" {
  description = "カスタムドメイン名"
  type        = string
  default     = null
}

variable "certificate_arn" {
  description = "ACM 証明書 ARN"
  type        = string
  default     = null
}

variable "tags" {
  description = "リソースタグ"
  type        = map(string)
  default     = {}
}
