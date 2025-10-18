variable "repository_name" {
  description = "ECR リポジトリ名"
  type        = string
}

variable "image_tag_mutability" {
  description = "イメージタグの可変性 (MUTABLE または IMMUTABLE)"
  type        = string
  default     = "MUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutability は MUTABLE または IMMUTABLE である必要があります。"
  }
}

variable "scan_on_push" {
  description = "プッシュ時にイメージスキャンを実行"
  type        = bool
  default     = true
}

variable "encryption_type" {
  description = "暗号化タイプ (AES256 または KMS)"
  type        = string
  default     = "AES256"

  validation {
    condition     = contains(["AES256", "KMS"], var.encryption_type)
    error_message = "encryption_type は AES256 または KMS である必要があります。"
  }
}

variable "kms_key_arn" {
  description = "KMS キー ARN（encryption_type が KMS の場合）"
  type        = string
  default     = null
}

variable "enable_lifecycle_policy" {
  description = "ライフサイクルポリシーを有効化"
  type        = bool
  default     = true
}

variable "max_image_count" {
  description = "保持する最大イメージ数"
  type        = number
  default     = 10
}

variable "untagged_image_retention_days" {
  description = "タグなしイメージの保持期間（日）"
  type        = number
  default     = 7
}

variable "allowed_account_ids" {
  description = "クロスアカウントアクセスを許可する AWS アカウント ID のリスト"
  type        = list(string)
  default     = []
}

variable "replication_regions" {
  description = "レプリケーション先リージョンのリスト"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "リソースタグ"
  type        = map(string)
  default     = {}
}
