variable "user_pool_name" {
  description = "Cognito User Pool 名"
  type        = string
}

variable "client_name" {
  description = "Cognito User Pool Client 名"
  type        = string
}

variable "username_attributes" {
  description = "ユーザー名として使用する属性"
  type        = list(string)
  default     = ["email"]
}

variable "auto_verified_attributes" {
  description = "自動検証する属性"
  type        = list(string)
  default     = ["email"]
}

variable "password_policy" {
  description = "パスワードポリシー"
  type = object({
    minimum_length                   = number
    require_lowercase                = bool
    require_uppercase                = bool
    require_numbers                  = bool
    require_symbols                  = bool
    temporary_password_validity_days = number
  })
  default = {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }
}

variable "mfa_configuration" {
  description = "MFA 設定 (OFF, ON, OPTIONAL)"
  type        = string
  default     = "OPTIONAL"
}

variable "deletion_protection" {
  description = "削除保護を有効にするか"
  type        = string
  default     = "ACTIVE"
}

variable "explicit_auth_flows" {
  description = "認証フロー"
  type        = list(string)
  default = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

variable "refresh_token_validity" {
  description = "リフレッシュトークンの有効期限（日）"
  type        = number
  default     = 30
}

variable "access_token_validity" {
  description = "アクセストークンの有効期限（時間）"
  type        = number
  default     = 1
}

variable "id_token_validity" {
  description = "ID トークンの有効期限（時間）"
  type        = number
  default     = 1
}

variable "enable_oauth" {
  description = "OAuth を有効にするか"
  type        = bool
  default     = false
}

variable "allowed_oauth_flows" {
  description = "許可する OAuth フロー"
  type        = list(string)
  default     = []
}

variable "allowed_oauth_scopes" {
  description = "許可する OAuth スコープ"
  type        = list(string)
  default     = []
}

variable "callback_urls" {
  description = "コールバック URL"
  type        = list(string)
  default     = []
}

variable "logout_urls" {
  description = "ログアウト URL"
  type        = list(string)
  default     = []
}

variable "read_attributes" {
  description = "読み取り可能な属性"
  type        = list(string)
  default = [
    "email",
    "email_verified",
    "name",
    "preferred_username"
  ]
}

variable "write_attributes" {
  description = "書き込み可能な属性"
  type        = list(string)
  default = [
    "email",
    "name",
    "preferred_username"
  ]
}

variable "domain_name" {
  description = "Cognito ドメイン名（オプション）"
  type        = string
  default     = null
}

variable "enable_ui_customization" {
  description = "Hosted UI のカスタマイズを有効にするか"
  type        = bool
  default     = false
}

variable "ui_customization_css" {
  description = "Hosted UI のカスタム CSS"
  type        = string
  default     = ""
}

variable "ui_logo_file" {
  description = "Hosted UI のロゴ画像ファイルパス（オプション）"
  type        = string
  default     = null
}

variable "tags" {
  description = "リソースに付与するタグ"
  type        = map(string)
  default     = {}
}
