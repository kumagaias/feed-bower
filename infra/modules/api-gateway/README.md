# API Gateway モジュール

Lambda 関数と統合する API Gateway REST API を作成するモジュール。

## 機能

- API Gateway REST API の作成
- Lambda プロキシ統合
- CORS 設定
- CloudWatch Logs 統合
- X-Ray トレーシング（オプション）
- スロットリング設定
- レスポンスキャッシング（オプション）
- カスタムドメイン（オプション）
- アクセスログ

## 使用例

### 基本的な使用方法

```hcl
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name             = "feed-bower-api"
  api_description      = "Feed Bower REST API"
  stage_name           = "prod"
  lambda_invoke_arn    = module.lambda.function_invoke_arn
  lambda_function_name = module.lambda.function_name

  enable_cors        = true
  cors_allow_origins = ["https://feed-bower.com"]
  cors_allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  cors_allow_headers = ["Content-Type", "Authorization"]

  logging_level      = "INFO"
  log_retention_days = 7

  throttling_burst_limit = 5000
  throttling_rate_limit  = 10000

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### カスタムドメインの使用

```hcl
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name             = "feed-bower-api"
  stage_name           = "prod"
  lambda_invoke_arn    = module.lambda.function_invoke_arn
  lambda_function_name = module.lambda.function_name

  custom_domain_name = "api.feed-bower.com"
  certificate_arn    = aws_acm_certificate.api.arn

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}

# Route53 レコードの作成
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.feed-bower.com"
  type    = "A"

  alias {
    name                   = module.api_gateway.custom_domain_cloudfront_domain_name
    zone_id                = module.api_gateway.custom_domain_cloudfront_zone_id
    evaluate_target_health = false
  }
}
```

### キャッシング有効化

```hcl
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name             = "feed-bower-api"
  stage_name           = "prod"
  lambda_invoke_arn    = module.lambda.function_invoke_arn
  lambda_function_name = module.lambda.function_name

  caching_enabled      = true
  cache_ttl_in_seconds = 300  # 5分

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### X-Ray トレーシング有効化

```hcl
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name             = "feed-bower-api"
  stage_name           = "prod"
  lambda_invoke_arn    = module.lambda.function_invoke_arn
  lambda_function_name = module.lambda.function_name

  xray_tracing_enabled = true
  data_trace_enabled   = true

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| api_name | API Gateway 名 | string | - | yes |
| api_description | API の説明 | string | "" | no |
| stage_name | ステージ名 | string | prod | no |
| endpoint_type | エンドポイントタイプ (REGIONAL, EDGE, PRIVATE) | string | REGIONAL | no |
| lambda_invoke_arn | Lambda 関数の Invoke ARN | string | - | yes |
| lambda_function_name | Lambda 関数名 | string | - | yes |
| enable_cors | CORS を有効化 | bool | true | no |
| cors_allow_origins | CORS 許可オリジン | list(string) | ["*"] | no |
| cors_allow_methods | CORS 許可メソッド | list(string) | ["GET", "POST", "PUT", "DELETE", "OPTIONS"] | no |
| cors_allow_headers | CORS 許可ヘッダー | list(string) | ["Content-Type", "Authorization", ...] | no |
| logging_level | ログレベル (OFF, ERROR, INFO) | string | INFO | no |
| data_trace_enabled | データトレースを有効化 | bool | false | no |
| log_retention_days | CloudWatch Logs 保持期間 (日) | number | 7 | no |
| xray_tracing_enabled | X-Ray トレーシングを有効化 | bool | false | no |
| throttling_burst_limit | バーストリミット（リクエスト数） | number | 5000 | no |
| throttling_rate_limit | レートリミット（リクエスト/秒） | number | 10000 | no |
| caching_enabled | キャッシングを有効化 | bool | false | no |
| cache_ttl_in_seconds | キャッシュ TTL（秒） | number | 300 | no |
| custom_domain_name | カスタムドメイン名 | string | null | no |
| certificate_arn | ACM 証明書 ARN | string | null | no |
| tags | リソースタグ | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| api_id | API Gateway ID |
| api_arn | API Gateway ARN |
| api_execution_arn | API Gateway Execution ARN |
| stage_name | ステージ名 |
| stage_arn | ステージ ARN |
| invoke_url | API Gateway Invoke URL |
| custom_domain_name | カスタムドメイン名 |
| custom_domain_cloudfront_domain_name | カスタムドメインの CloudFront ドメイン名 |
| log_group_name | CloudWatch Logs グループ名 |

## 注意事項

- Lambda プロキシ統合を使用しているため、Lambda 側でレスポンス形式を適切に設定する必要があります
- CORS を有効にする場合、Lambda 側でも CORS ヘッダーを返す必要があります
- カスタムドメインを使用する場合、ACM 証明書が必要です
- キャッシングを有効にすると追加コストが発生します
- X-Ray トレーシングを有効にすると追加コストが発生します
- スロットリング設定はアカウント全体の制限を超えないように設定してください
