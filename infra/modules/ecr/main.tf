terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.17"
    }
  }
}

# ECR リポジトリ
resource "aws_ecr_repository" "repository" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.kms_key_arn
  }

  tags = var.tags
}

# ライフサイクルポリシー
resource "aws_ecr_lifecycle_policy" "policy" {
  count      = var.enable_lifecycle_policy ? 1 : 0
  repository = aws_ecr_repository.repository.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "${var.untagged_image_retention_days} 日以上経過したタグなしイメージを削除"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_image_retention_days
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "最新の ${var.max_image_count} イメージを保持"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# リポジトリポリシー（クロスアカウントアクセス用）
resource "aws_ecr_repository_policy" "policy" {
  count      = length(var.allowed_account_ids) > 0 ? 1 : 0
  repository = aws_ecr_repository.repository.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountPull"
        Effect = "Allow"
        Principal = {
          AWS = [for account_id in var.allowed_account_ids : "arn:aws:iam::${account_id}:root"]
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

# レプリケーション設定
resource "aws_ecr_replication_configuration" "replication" {
  count = length(var.replication_regions) > 0 ? 1 : 0

  replication_configuration {
    rule {
      dynamic "destination" {
        for_each = var.replication_regions
        content {
          region      = destination.value
          registry_id = data.aws_caller_identity.current.account_id
        }
      }
    }
  }
}

data "aws_caller_identity" "current" {}
