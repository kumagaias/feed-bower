terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Amplify アプリケーション
resource "aws_amplify_app" "app" {
  name       = var.app_name
  repository = var.repository_url

  # ビルド設定
  build_spec = var.build_spec != null ? var.build_spec : templatefile("${path.module}/templates/amplify.yml.tpl", {
    node_version     = var.node_version
    build_command    = var.build_command
    output_directory = var.output_directory
  })

  # 環境変数
  environment_variables = var.environment_variables

  # カスタムルール（SPA 用）
  dynamic "custom_rule" {
    for_each = var.enable_spa_redirect ? [1] : []
    content {
      source = "/<*>"
      status = "404-200"
      target = "/index.html"
    }
  }

  # カスタムヘッダー
  dynamic "custom_rule" {
    for_each = var.custom_headers
    content {
      source = custom_rule.value.source
      status = custom_rule.value.status
      target = custom_rule.value.target
    }
  }

  # 基本認証（オプション）
  enable_basic_auth      = var.enable_basic_auth
  basic_auth_credentials = var.enable_basic_auth ? base64encode("${var.basic_auth_username}:${var.basic_auth_password}") : null

  # 自動ブランチ作成
  enable_auto_branch_creation   = var.enable_auto_branch_creation
  auto_branch_creation_patterns = var.auto_branch_creation_patterns

  dynamic "auto_branch_creation_config" {
    for_each = var.enable_auto_branch_creation ? [1] : []
    content {
      enable_auto_build             = true
      enable_basic_auth             = var.enable_basic_auth
      basic_auth_credentials        = var.enable_basic_auth ? base64encode("${var.basic_auth_username}:${var.basic_auth_password}") : null
      enable_pull_request_preview   = var.enable_pull_request_preview
      pull_request_environment_name = "pr"
    }
  }

  # IAM サービスロール
  iam_service_role_arn = var.iam_service_role_arn != null ? var.iam_service_role_arn : aws_iam_role.amplify[0].arn

  tags = var.tags
}

# Amplify サービスロール（カスタムロールが指定されていない場合）
resource "aws_iam_role" "amplify" {
  count = var.iam_service_role_arn == null ? 1 : 0
  name  = "${var.app_name}-amplify-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "amplify.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "amplify_backend" {
  count      = var.iam_service_role_arn == null ? 1 : 0
  role       = aws_iam_role.amplify[0].name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"
}

# ブランチ設定
resource "aws_amplify_branch" "branches" {
  for_each = var.branches

  app_id      = aws_amplify_app.app.id
  branch_name = each.key

  enable_auto_build             = lookup(each.value, "enable_auto_build", true)
  enable_pull_request_preview   = lookup(each.value, "enable_pull_request_preview", false)
  pull_request_environment_name = lookup(each.value, "pull_request_environment_name", null)
  stage                         = lookup(each.value, "stage", "PRODUCTION")

  # ブランチ固有の環境変数
  environment_variables = lookup(each.value, "environment_variables", {})

  tags = var.tags
}

# カスタムドメイン
resource "aws_amplify_domain_association" "domain" {
  count       = var.custom_domain != null ? 1 : 0
  app_id      = aws_amplify_app.app.id
  domain_name = var.custom_domain

  # サブドメイン設定
  dynamic "sub_domain" {
    for_each = var.domain_config
    content {
      branch_name = sub_domain.value.branch_name
      prefix      = sub_domain.value.prefix
    }
  }

  wait_for_verification = var.wait_for_domain_verification
}

# Webhook（CI/CD トリガー用）
resource "aws_amplify_webhook" "webhook" {
  for_each = var.webhooks

  app_id      = aws_amplify_app.app.id
  branch_name = each.value.branch_name
  description = each.value.description
}
