terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.17"
    }
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "pool" {
  name = var.user_pool_name

  # ユーザー名の設定
  username_attributes      = var.username_attributes
  auto_verified_attributes = var.auto_verified_attributes

  # 自動確認設定
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # メール設定（デフォルトの Cognito メールを使用）
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # 検証メッセージのカスタマイズ
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Feed Bower - Verify your email"
    email_message        = "Welcome to Feed Bower! Your verification code is: {####}"
  }

  # パスワードポリシー
  password_policy {
    minimum_length                   = var.password_policy.minimum_length
    require_lowercase                = var.password_policy.require_lowercase
    require_uppercase                = var.password_policy.require_uppercase
    require_numbers                  = var.password_policy.require_numbers
    require_symbols                  = var.password_policy.require_symbols
    temporary_password_validity_days = var.password_policy.temporary_password_validity_days
  }

  # アカウント回復設定
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # MFA 設定
  mfa_configuration = var.mfa_configuration

  # ユーザープール削除保護
  deletion_protection = var.deletion_protection

  tags = var.tags
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "client" {
  name         = var.client_name
  user_pool_id = aws_cognito_user_pool.pool.id

  # 認証フロー
  explicit_auth_flows = var.explicit_auth_flows

  # トークンの有効期限
  refresh_token_validity = var.refresh_token_validity
  access_token_validity  = var.access_token_validity
  id_token_validity      = var.id_token_validity
  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
    id_token      = "hours"
  }

  # OAuth 設定
  allowed_oauth_flows_user_pool_client = var.enable_oauth
  allowed_oauth_flows                  = var.allowed_oauth_flows
  allowed_oauth_scopes                 = var.allowed_oauth_scopes
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls

  # セキュリティ設定
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # 読み取り・書き込み属性
  read_attributes  = var.read_attributes
  write_attributes = var.write_attributes
}

# Cognito User Pool Domain (オプション)
resource "aws_cognito_user_pool_domain" "domain" {
  count = var.domain_name != null ? 1 : 0

  domain       = var.domain_name
  user_pool_id = aws_cognito_user_pool.pool.id
}
