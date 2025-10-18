variable "app_name" {
  description = "Amplify アプリケーション名"
  type        = string
}

variable "repository_url" {
  description = "Git リポジトリ URL"
  type        = string
}

variable "build_spec" {
  description = "カスタムビルド仕様（YAML 形式）"
  type        = string
  default     = null
}

variable "node_version" {
  description = "Node.js バージョン"
  type        = string
  default     = "24"
}

variable "build_command" {
  description = "ビルドコマンド"
  type        = string
  default     = "npm run build"
}

variable "output_directory" {
  description = "ビルド出力ディレクトリ"
  type        = string
  default     = ".next"
}

variable "environment_variables" {
  description = "環境変数"
  type        = map(string)
  default     = {}
}

variable "enable_spa_redirect" {
  description = "SPA リダイレクトを有効化（404 を index.html にリダイレクト）"
  type        = bool
  default     = true
}

variable "custom_headers" {
  description = "カスタムヘッダー設定"
  type = list(object({
    source = string
    status = string
    target = string
  }))
  default = []
}

variable "enable_basic_auth" {
  description = "基本認証を有効化"
  type        = bool
  default     = false
}

variable "basic_auth_username" {
  description = "基本認証ユーザー名"
  type        = string
  default     = ""
  sensitive   = true
}

variable "basic_auth_password" {
  description = "基本認証パスワード"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_auto_branch_creation" {
  description = "自動ブランチ作成を有効化"
  type        = bool
  default     = false
}

variable "auto_branch_creation_patterns" {
  description = "自動ブランチ作成パターン"
  type        = list(string)
  default     = ["feature/*", "bugfix/*"]
}

variable "enable_pull_request_preview" {
  description = "プルリクエストプレビューを有効化"
  type        = bool
  default     = false
}

variable "iam_service_role_arn" {
  description = "Amplify サービスロール ARN（指定しない場合は自動作成）"
  type        = string
  default     = null
}

variable "branches" {
  description = "ブランチ設定"
  type = map(object({
    enable_auto_build             = optional(bool, true)
    enable_pull_request_preview   = optional(bool, false)
    pull_request_environment_name = optional(string)
    stage                         = optional(string, "PRODUCTION")
    environment_variables         = optional(map(string), {})
  }))
  default = {}
}

variable "custom_domain" {
  description = "カスタムドメイン名"
  type        = string
  default     = null
}

variable "domain_config" {
  description = "ドメイン設定（サブドメインとブランチのマッピング）"
  type = list(object({
    branch_name = string
    prefix      = string
  }))
  default = []
}

variable "wait_for_domain_verification" {
  description = "ドメイン検証の完了を待つ"
  type        = bool
  default     = true
}

variable "webhooks" {
  description = "Webhook 設定"
  type = map(object({
    branch_name = string
    description = string
  }))
  default = {}
}

variable "tags" {
  description = "リソースタグ"
  type        = map(string)
  default     = {}
}
