variable "table_name" {
  description = "DynamoDB テーブル名"
  type        = string
}

variable "billing_mode" {
  description = "課金モード (PROVISIONED または PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PROVISIONED", "PAY_PER_REQUEST"], var.billing_mode)
    error_message = "billing_mode は PROVISIONED または PAY_PER_REQUEST である必要があります。"
  }
}

variable "hash_key" {
  description = "パーティションキー"
  type        = string
}

variable "range_key" {
  description = "ソートキー（オプション）"
  type        = string
  default     = null
}

variable "attributes" {
  description = "属性定義"
  type = list(object({
    name = string
    type = string
  }))
}

variable "read_capacity" {
  description = "読み取りキャパシティユニット（PROVISIONED モードのみ）"
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "書き込みキャパシティユニット（PROVISIONED モードのみ）"
  type        = number
  default     = 5
}

variable "global_secondary_indexes" {
  description = "Global Secondary Index の定義"
  type = list(object({
    name               = string
    hash_key           = string
    range_key          = optional(string)
    projection_type    = optional(string)
    non_key_attributes = optional(list(string))
    read_capacity      = optional(number)
    write_capacity     = optional(number)
  }))
  default = []
}

variable "local_secondary_indexes" {
  description = "Local Secondary Index の定義"
  type = list(object({
    name               = string
    range_key          = string
    projection_type    = optional(string)
    non_key_attributes = optional(list(string))
  }))
  default = []
}

variable "ttl_enabled" {
  description = "TTL を有効化"
  type        = bool
  default     = false
}

variable "ttl_attribute_name" {
  description = "TTL 属性名"
  type        = string
  default     = "ttl"
}

variable "point_in_time_recovery_enabled" {
  description = "ポイントインタイムリカバリを有効化"
  type        = bool
  default     = false
}

variable "encryption_enabled" {
  description = "サーバーサイド暗号化を有効化"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS キー ARN（カスタムキーを使用する場合）"
  type        = string
  default     = null
}

variable "stream_enabled" {
  description = "DynamoDB Streams を有効化"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "ストリームビュータイプ"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"

  validation {
    condition     = contains(["KEYS_ONLY", "NEW_IMAGE", "OLD_IMAGE", "NEW_AND_OLD_IMAGES"], var.stream_view_type)
    error_message = "stream_view_type は KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES のいずれかである必要があります。"
  }
}

variable "autoscaling_enabled" {
  description = "Auto Scaling を有効化（PROVISIONED モードのみ）"
  type        = bool
  default     = false
}

variable "autoscaling_read_max_capacity" {
  description = "読み取りキャパシティの最大値"
  type        = number
  default     = 100
}

variable "autoscaling_write_max_capacity" {
  description = "書き込みキャパシティの最大値"
  type        = number
  default     = 100
}

variable "autoscaling_read_target_value" {
  description = "読み取りキャパシティの目標使用率（%）"
  type        = number
  default     = 70
}

variable "autoscaling_write_target_value" {
  description = "書き込みキャパシティの目標使用率（%）"
  type        = number
  default     = 70
}

variable "tags" {
  description = "リソースタグ"
  type        = map(string)
  default     = {}
}
