terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.17"
    }
  }
}

# Lambda 実行ロール
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-${var.environment}-feed-search-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# CloudWatch Logs 権限ポリシー
resource "aws_iam_role_policy" "lambda_logging" {
  name = "${var.project_name}-${var.environment}-feed-search-logging"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ECR 読み取り権限ポリシー（コンテナイメージのプル用）
resource "aws_iam_role_policy" "lambda_ecr" {
  name = "${var.project_name}-${var.environment}-feed-search-ecr"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = var.ecr_repository_arn
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Logs グループ
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-feed-search"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# Lambda 関数（ECR イメージ）
resource "aws_lambda_function" "feed_search" {
  function_name = "${var.project_name}-${var.environment}-feed-search"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = var.image_uri

  memory_size = var.lambda_memory
  timeout     = var.lambda_timeout

  environment {
    variables = {
      ENVIRONMENT = var.environment
      LOG_LEVEL   = "INFO"
    }
  }

  tags = var.tags

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy.lambda_logging,
    aws_iam_role_policy.lambda_ecr
  ]
}

# Bedrock Agent 呼び出し用の Lambda 権限
resource "aws_lambda_permission" "bedrock_agent" {
  statement_id  = "AllowBedrockAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.feed_search.function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = "arn:aws:bedrock:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:agent/*"
}

# Bedrock Agent IAM ロール
resource "aws_iam_role" "bedrock_agent_role" {
  name = "${var.project_name}-${var.environment}-bedrock-agent-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:agent/*"
          }
        }
      }
    ]
  })

  tags = var.tags
}

# Bedrock Agent モデル呼び出し権限
resource "aws_iam_role_policy" "bedrock_agent_model" {
  name = "${var.project_name}-${var.environment}-bedrock-agent-model"
  role = aws_iam_role.bedrock_agent_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:${data.aws_region.current.id}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      }
    ]
  })
}

# Bedrock Agent Lambda 呼び出し権限
resource "aws_iam_role_policy" "bedrock_agent_lambda" {
  name = "${var.project_name}-${var.environment}-bedrock-agent-lambda"
  role = aws_iam_role.bedrock_agent_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.feed_search.arn
      }
    ]
  })
}

# Bedrock Agent リソース
resource "aws_bedrockagent_agent" "feed_bower_agent" {
  agent_name                  = "${var.project_name}-${var.environment}-agent"
  agent_resource_role_arn     = aws_iam_role.bedrock_agent_role.arn
  foundation_model            = "anthropic.claude-3-haiku-20240307-v1:0"
  idle_session_ttl_in_seconds = 600

  instruction = <<-EOT
    You are a feed recommendation assistant. When users provide keywords, use the searchFeeds action to find relevant RSS/Atom feeds from the curated database.
    
    Process:
    1. Extract keywords from user input
    2. Call searchFeeds action with those keywords
    3. Return the results as a JSON array
    
    Always use the searchFeeds action - it has access to a curated database of high-quality feeds.
  EOT

  tags = var.tags

  depends_on = [
    aws_iam_role_policy.bedrock_agent_model,
    aws_iam_role_policy.bedrock_agent_lambda
  ]
}

# API スキーマ定義
locals {
  api_schema = {
    openapi = "3.0.0"
    info = {
      title       = "Feed Search API"
      version     = "1.0.0"
      description = "API for searching RSS/Atom feeds based on keywords"
    }
    paths = {
      "/search-feeds" = {
        post = {
          summary     = "Search for RSS/Atom feeds"
          description = "Search the curated feed database for feeds matching the provided keywords"
          operationId = "searchFeeds"
          requestBody = {
            required = true
            content = {
              "application/json" = {
                schema = {
                  type = "object"
                  properties = {
                    keywords = {
                      type        = "array"
                      items       = { type = "string" }
                      minItems    = 1
                      maxItems    = 8
                      description = "Keywords to search for in feed titles, descriptions, categories, and tags"
                    }
                    language = {
                      type        = "string"
                      enum        = ["ja", "en"]
                      default     = "ja"
                      description = "Preferred language for feed results (ja=Japanese, en=English)"
                    }
                    limit = {
                      type        = "integer"
                      minimum     = 1
                      maximum     = 20
                      default     = 20
                      description = "Maximum number of feed results to return"
                    }
                  }
                  required = ["keywords"]
                }
              }
            }
          }
          responses = {
            "200" = {
              description = "Successful feed search"
              content = {
                "application/json" = {
                  schema = {
                    type = "object"
                    properties = {
                      feeds = {
                        type = "array"
                        items = {
                          type = "object"
                          properties = {
                            url = {
                              type        = "string"
                              format      = "uri"
                              description = "Feed URL"
                            }
                            title = {
                              type        = "string"
                              description = "Feed title"
                            }
                            description = {
                              type        = "string"
                              description = "Feed description"
                            }
                            category = {
                              type        = "string"
                              description = "Feed category"
                            }
                            language = {
                              type        = "string"
                              description = "Feed language"
                            }
                            relevance = {
                              type        = "number"
                              format      = "float"
                              minimum     = 0
                              maximum     = 1
                              description = "Relevance score (0-1)"
                            }
                          }
                          required = ["url", "title", "description", "category", "relevance"]
                        }
                      }
                      total = {
                        type        = "integer"
                        description = "Total number of feeds returned"
                      }
                    }
                    required = ["feeds", "total"]
                  }
                }
              }
            }
            "400" = {
              description = "Bad request - invalid parameters"
            }
            "500" = {
              description = "Internal server error"
            }
          }
        }
      }
      "/validate-feeds" = {
        post = {
          summary     = "Validate RSS/Atom feed URLs"
          description = "Check if the provided URLs are valid and accessible RSS/Atom feeds"
          operationId = "validateFeeds"
          requestBody = {
            required = true
            content = {
              "application/json" = {
                schema = {
                  type = "object"
                  properties = {
                    action = {
                      type        = "string"
                      enum        = ["validate"]
                      default     = "validate"
                      description = "Action type"
                    }
                    feedUrls = {
                      type        = "array"
                      items       = { type = "string", format = "uri" }
                      minItems    = 1
                      maxItems    = 10
                      description = "Feed URLs to validate"
                    }
                  }
                  required = ["feedUrls"]
                }
              }
            }
          }
          responses = {
            "200" = {
              description = "Validation results"
              content = {
                "application/json" = {
                  schema = {
                    type = "object"
                    properties = {
                      validFeeds = {
                        type = "array"
                        items = {
                          type = "object"
                          properties = {
                            url         = { type = "string", format = "uri" }
                            valid       = { type = "boolean" }
                            title       = { type = "string" }
                            description = { type = "string" }
                            statusCode  = { type = "integer" }
                          }
                        }
                      }
                      invalidFeeds = {
                        type = "array"
                        items = {
                          type = "object"
                          properties = {
                            url   = { type = "string", format = "uri" }
                            valid = { type = "boolean" }
                            error = { type = "string" }
                          }
                        }
                      }
                      validCount   = { type = "integer" }
                      invalidCount = { type = "integer" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

# Action Group
resource "aws_bedrockagent_agent_action_group" "feed_search" {
  agent_id                   = aws_bedrockagent_agent.feed_bower_agent.agent_id
  agent_version              = "DRAFT"
  action_group_name          = "feed-search"
  description                = "Search for RSS/Atom feeds based on keywords"
  skip_resource_in_use_check = true
  prepare_agent              = true

  action_group_executor {
    lambda = aws_lambda_function.feed_search.arn
  }

  api_schema {
    payload = jsonencode(local.api_schema)
  }

  depends_on = [
    aws_lambda_permission.bedrock_agent
  ]
}

# Bedrock Agent エイリアス（本番環境）
resource "aws_bedrockagent_agent_alias" "production" {
  agent_id         = aws_bedrockagent_agent.feed_bower_agent.agent_id
  agent_alias_name = "production"
  description      = "Production alias for Feed Bower agent"

  depends_on = [
    aws_bedrockagent_agent_action_group.feed_search
  ]

  tags = var.tags
}

# データソース
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
