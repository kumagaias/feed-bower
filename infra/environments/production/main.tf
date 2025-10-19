terraform {
  required_version = ">= 1.13.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.17"
    }
  }

  # バックエンド設定（S3 でステート管理）
  # 初回は local backend で実行し、S3 バケット作成後にコメントを外して terraform init -migrate-state を実行
  backend "s3" {
    # bucket       = "feed-bower-terraform-state-development"
    bucket       = "feed-bower-terraform-state-production"
    key          = "production/terraform.tfstate"
    region       = "ap-northeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "dev"
      Project     = "feed-bower"
      ManagedBy   = "terraform"
    }
  }
}

# ローカル変数
locals {
  project_name = "feed-bower"
  environment  = "production"

  common_tags = {
    Environment = local.environment
    Project     = local.project_name
  }

  # DynamoDB テーブル名
  table_names = {
    users          = "${local.project_name}-users-${local.environment}"
    bowers         = "${local.project_name}-bowers-${local.environment}"
    feeds          = "${local.project_name}-feeds-${local.environment}"
    articles       = "${local.project_name}-articles-${local.environment}"
    liked_articles = "${local.project_name}-liked-articles-${local.environment}"
    chick_stats    = "${local.project_name}-chick-stats-${local.environment}"
  }
}

# ECR リポジトリ
module "ecr" {
  source = "../../modules/ecr"

  repository_name               = "${local.project_name}-api-${local.environment}"
  image_tag_mutability          = "MUTABLE"
  scan_on_push                  = true
  enable_lifecycle_policy       = true
  max_image_count               = 5
  untagged_image_retention_days = 7

  tags = local.common_tags
}

# Cognito User Pool
module "cognito" {
  source = "../../modules/cognito"

  user_pool_name = "${local.project_name}-${local.environment}"
  client_name    = "${local.project_name}-client-${local.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy = {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = false
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  mfa_configuration   = "OFF"
  deletion_protection = "INACTIVE"

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  refresh_token_validity = 30
  access_token_validity  = 1
  id_token_validity      = 1

  tags = local.common_tags
}

# DynamoDB テーブル: Users
module "dynamodb_users" {
  source = "../../modules/dynamodb"

  table_name   = local.table_names.users
  hash_key     = "user_id"
  billing_mode = "PAY_PER_REQUEST"

  attributes = [
    {
      name = "user_id"
      type = "S"
    },
    {
      name = "email"
      type = "S"
    }
  ]

  global_secondary_indexes = [
    {
      name            = "EmailIndex"
      hash_key        = "email"
      projection_type = "ALL"
    }
  ]

  ttl_enabled                    = false
  point_in_time_recovery_enabled = false
  stream_enabled                 = false

  tags = local.common_tags
}

# DynamoDB テーブル: Bowers
module "dynamodb_bowers" {
  source = "../../modules/dynamodb"

  table_name   = local.table_names.bowers
  hash_key     = "bower_id"
  billing_mode = "PAY_PER_REQUEST"

  attributes = [
    {
      name = "bower_id"
      type = "S"
    },
    {
      name = "user_id"
      type = "S"
    }
  ]

  global_secondary_indexes = [
    {
      name            = "UserIdIndex"
      hash_key        = "user_id"
      projection_type = "ALL"
    }
  ]

  ttl_enabled                    = false
  point_in_time_recovery_enabled = false
  stream_enabled                 = false

  tags = local.common_tags
}

# DynamoDB テーブル: Feeds
module "dynamodb_feeds" {
  source = "../../modules/dynamodb"

  table_name   = local.table_names.feeds
  hash_key     = "feed_id"
  billing_mode = "PAY_PER_REQUEST"

  attributes = [
    {
      name = "feed_id"
      type = "S"
    },
    {
      name = "bower_id"
      type = "S"
    }
  ]

  global_secondary_indexes = [
    {
      name            = "BowerIdIndex"
      hash_key        = "bower_id"
      projection_type = "ALL"
    }
  ]

  ttl_enabled                    = false
  point_in_time_recovery_enabled = false
  stream_enabled                 = false

  tags = local.common_tags
}

# DynamoDB テーブル: Articles
module "dynamodb_articles" {
  source = "../../modules/dynamodb"

  table_name   = local.table_names.articles
  hash_key     = "article_id"
  billing_mode = "PAY_PER_REQUEST"

  attributes = [
    {
      name = "article_id"
      type = "S"
    },
    {
      name = "feed_id"
      type = "S"
    },
    {
      name = "published_at"
      type = "N"
    }
  ]

  global_secondary_indexes = [
    {
      name            = "FeedIdPublishedAtIndex"
      hash_key        = "feed_id"
      range_key       = "published_at"
      projection_type = "ALL"
    }
  ]

  ttl_enabled                    = false
  point_in_time_recovery_enabled = false
  stream_enabled                 = false

  tags = local.common_tags
}

# DynamoDB テーブル: LikedArticles
module "dynamodb_liked_articles" {
  source = "../../modules/dynamodb"

  table_name   = local.table_names.liked_articles
  hash_key     = "user_id"
  range_key    = "article_id"
  billing_mode = "PAY_PER_REQUEST"

  attributes = [
    {
      name = "user_id"
      type = "S"
    },
    {
      name = "article_id"
      type = "S"
    }
  ]

  global_secondary_indexes = []

  ttl_enabled                    = false
  point_in_time_recovery_enabled = false
  stream_enabled                 = false

  tags = local.common_tags
}

# DynamoDB テーブル: ChickStats
module "dynamodb_chick_stats" {
  source = "../../modules/dynamodb"

  table_name   = local.table_names.chick_stats
  hash_key     = "user_id"
  billing_mode = "PAY_PER_REQUEST"

  attributes = [
    {
      name = "user_id"
      type = "S"
    }
  ]

  global_secondary_indexes = []

  ttl_enabled                    = false
  point_in_time_recovery_enabled = false
  stream_enabled                 = false

  tags = local.common_tags
}

# Lambda 関数
module "lambda" {
  source = "../../modules/lambda"

  function_name = "${local.project_name}-api-${local.environment}"
  image_uri     = "${module.ecr.repository_url}:latest"
  memory_size   = 1024
  timeout       = 30

  environment_variables = {
    ENVIRONMENT           = local.environment
    DYNAMODB_TABLE_PREFIX = "${local.project_name}-"
    DYNAMODB_TABLE_SUFFIX = "-${local.environment}"
    LOG_LEVEL             = "INFO"
  }

  dynamodb_table_arns = [
    module.dynamodb_users.table_arn,
    module.dynamodb_bowers.table_arn,
    module.dynamodb_feeds.table_arn,
    module.dynamodb_articles.table_arn,
    module.dynamodb_liked_articles.table_arn,
    module.dynamodb_chick_stats.table_arn,
  ]

  enable_bedrock     = true
  log_retention_days = 30
  create_alias       = true
  vpc_config         = null

  tags = local.common_tags

  depends_on = [
    module.dynamodb_users,
    module.dynamodb_bowers,
    module.dynamodb_feeds,
    module.dynamodb_articles,
    module.dynamodb_liked_articles,
    module.dynamodb_chick_stats
  ]
}

# API Gateway
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name             = "${local.project_name}-api-${local.environment}"
  api_description      = "Feed Bower API - Development Environment"
  lambda_invoke_arn    = module.lambda.function_invoke_arn
  lambda_function_name = module.lambda.function_name
  stage_name           = local.environment

  enable_cors        = true
  cors_allow_origins = [
    "https://feed-bower.net",
    "https://www.feed-bower.net",
    "https://main.dwjgow9ofphjt.amplifyapp.com"  # Amplify ドメイン
  ]
  cors_allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  cors_allow_headers = ["Content-Type", "Authorization", "X-Requested-With"]

  logging_level      = "ERROR"
  log_retention_days = 30

  throttling_burst_limit = 100
  throttling_rate_limit  = 50

  custom_domain_name = null
  certificate_arn    = null

  tags = local.common_tags

  depends_on = [module.lambda]
}

# Amplify Hosting
module "amplify" {
  source = "../../modules/amplify"

  app_name       = "${local.project_name}-${local.environment}"
  repository_url = var.github_repository_url
  access_token   = var.github_token

  branches = {
    main = {
      stage                       = "PRODUCTION"
      enable_auto_build           = true
      enable_pull_request_preview = false
      environment_variables = {
        NEXT_PUBLIC_API_URL                    = module.api_gateway.invoke_url
        NEXT_PUBLIC_ENV                        = local.environment
        NEXT_PUBLIC_COGNITO_USER_POOL_ID       = module.cognito.user_pool_id
        NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID = module.cognito.client_id
        NEXT_PUBLIC_AWS_REGION                 = var.aws_region
        _CUSTOM_IMAGE                          = "amplify:al2023"
      }
    }
  }

  build_spec       = file("${path.module}/../../../amplify.yml")  # モノレポ対応の buildSpec
  node_version     = "24"
  build_command    = "npm run build"
  output_directory = ".next"

  environment_variables = {
    NEXT_PUBLIC_API_URL                    = module.api_gateway.invoke_url
    NEXT_PUBLIC_ENV                        = local.environment
    NEXT_PUBLIC_COGNITO_USER_POOL_ID       = module.cognito.user_pool_id
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID = module.cognito.client_id
    NEXT_PUBLIC_AWS_REGION                 = var.aws_region
    _LIVE_UPDATES = jsonencode([{
      pkg     = "node"
      type    = "nvm"
      version = "24"
    }])
  }

  enable_auto_branch_creation = false
  enable_pull_request_preview = false
  enable_basic_auth           = false

  custom_domain = "feed-bower.net"
  domain_config = [
    {
      branch_name = "main"
      prefix      = "www"
    }
  ]

  tags = local.common_tags

  depends_on = [module.api_gateway]
}

# GitHub OIDC for GitHub Actions
module "github_oidc" {
  source = "../../modules/github-oidc"

  role_name         = "GitHubActions-FeedBower-Production"
  github_repository = var.github_repository
  branch_name       = "main"
  environment_name  = "production"

  ecr_repository_arns = [
    module.ecr.repository_arn,
  ]

  lambda_function_arns = [
    module.lambda.function_arn,
  ]

  tags = local.common_tags

  depends_on = [
    module.ecr,
    module.lambda,
  ]
}
