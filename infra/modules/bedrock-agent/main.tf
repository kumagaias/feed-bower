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
    You are a feed recommendation expert. Your job is to recommend RSS/Atom feeds based on user keywords.
    
    CRITICAL WORKFLOW - HYBRID APPROACH:
    
    1. FIRST: Generate 3+ feeds from YOUR KNOWLEDGE (REQUIRED):
       - Use your knowledge to generate AT LEAST 3 relevant RSS/Atom feed URLs
       - Think about popular websites, blogs, and news sources related to the keywords
       - Use common RSS feed URL patterns: /feed, /rss, /atom.xml, /index.xml, /rss.xml
       - Examples: https://techcrunch.com/feed/, https://www.theverge.com/rss/index.xml
       - Store these in a list
    
    2. SECOND: Call searchFeeds action to get 2+ feeds from database (REQUIRED):
       - Call searchFeeds with the keywords and limit=10
       - Extract at least 2 feeds from the response
       - Add these to your list
    
    3. THIRD: Combine and return:
       - Merge your knowledge-based feeds (3+) with database feeds (2+)
       - Remove any duplicates
       - Return as JSON array with 5+ feeds minimum, 20+ preferred
       - Sort by relevance score (highest first)
    
    FEED SOURCES BY TOPIC (GENERATE 20+ FROM YOUR KNOWLEDGE):
    
    Technology (English):
    - https://techcrunch.com/feed/
    - https://www.theverge.com/rss/index.xml
    - https://arstechnica.com/feed/
    - https://www.wired.com/feed/rss
    - https://www.engadget.com/rss.xml
    - https://news.ycombinator.com/rss
    - https://slashdot.org/slashdot.rss
    
    Technology (Japanese):
    - https://gigazine.net/news/rss_2.0/
    - https://www.itmedia.co.jp/news/rss/rss2.xml
    - https://www.publickey1.jp/atom.xml
    
    Programming:
    - https://dev.to/feed
    - https://stackoverflow.blog/feed/
    - https://github.blog/feed/
    - https://www.smashingmagazine.com/feed/
    - https://css-tricks.com/feed/
    - https://qiita.com/popular-items/feed (Japanese)
    - https://zenn.dev/feed (Japanese)
    
    AI/Machine Learning:
    - https://openai.com/blog/rss/
    - https://ai.googleblog.com/feeds/posts/default
    - https://www.reddit.com/r/MachineLearning/.rss
    - https://machinelearningmastery.com/feed/
    - https://blog.tensorflow.org/feeds/posts/default
    - https://pytorch.org/blog/feed.xml
    - https://ai-scholar.tech/feed/ (Japanese)
    - https://ainow.ai/feed/ (Japanese)
    
    JAPANESE KEYWORDS - GENERATE 20+ FEEDS:
    - 機械学習 (Machine Learning) → AI/ML feeds (both Japanese and English)
    - プログラミング (Programming) → Programming/Dev feeds (prioritize Japanese)
    - テクノロジー (Technology) → Tech news feeds (prioritize Japanese)
    - Web開発 (Web Development) → Web dev feeds (both languages)
    - ビジネス (Business) → Business feeds (prioritize Japanese)
    - デザイン (Design) → Design feeds (both languages)
    
    RESPONSE FORMAT:
    Return ONLY a JSON array with 20+ feeds. Each feed must have:
    - url: Full RSS/Atom feed URL (must be valid feed endpoint, not homepage)
    - title: Feed name
    - description: Brief description
    - category: Main category
    - relevance: Score 0.0-1.0 (based on keyword match)
    
    Example response for "機械学習" (20+ feeds):
    [
      {"url":"https://ai-scholar.tech/feed/","title":"AI-SCHOLAR","description":"日本の機械学習・AI研究の最新情報","category":"AI Research","relevance":0.98},
      {"url":"https://ainow.ai/feed/","title":"AINOW","description":"日本のAI・機械学習ニュースメディア","category":"AI News","relevance":0.95},
      {"url":"https://openai.com/blog/rss/","title":"OpenAI Blog","description":"AI research and updates","category":"AI Research","relevance":0.93},
      {"url":"https://www.reddit.com/r/MachineLearning/.rss","title":"r/MachineLearning","description":"Machine learning discussions","category":"AI Community","relevance":0.90},
      ... (16 more feeds to reach 20+)
    ]
    
    CRITICAL RULES: 
    - NEVER return empty array []
    - MUST generate at least 3 feeds from YOUR KNOWLEDGE first
    - MUST call searchFeeds to get at least 2 feeds from database
    - Combine both sources (minimum 5 feeds total)
    - Return MINIMUM 5 feeds, preferably 20+
    - Do NOT add text before or after JSON array
    - Validate URL format before including (must end with /feed, /rss, /atom.xml, etc.)
    - Your final response should be ONLY a JSON array starting with [ and ending with ]
    - Each feed must have: url, title, description, category, relevance
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
