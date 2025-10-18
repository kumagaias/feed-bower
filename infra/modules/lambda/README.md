# Lambda モジュール

Go + ECR コンテナイメージを使用した Lambda 関数を作成するモジュール。

## 機能

- Lambda 関数の作成（コンテナイメージベース）
- IAM ロールとポリシーの自動設定
- DynamoDB アクセス権限
- Bedrock アクセス権限（オプション）
- CloudWatch Logs の設定
- VPC 統合（オプション）
- Provisioned Concurrency（オプション）
- Production エイリアス（オプション）

## 使用例

```hcl
module "lambda" {
  source = "../../modules/lambda"

  function_name = "feed-bower-api"
  image_uri     = "${aws_ecr_repository.app.repository_url}:latest"
  memory_size   = 512
  timeout       = 30

  environment_variables = {
    DYNAMODB_TABLE_PREFIX = "feed-bower"
    LOG_LEVEL            = "info"
    AWS_REGION           = "ap-northeast-1"
  }

  dynamodb_table_arns = [
    aws_dynamodb_table.users.arn,
    aws_dynamodb_table.bowers.arn,
    aws_dynamodb_table.feeds.arn,
    aws_dynamodb_table.articles.arn,
  ]

  enable_bedrock      = true
  log_retention_days  = 7
  create_alias        = true

  tags = {
    Environment = "dev"
    Project     = "feed-bower"
  }
}
```

## VPC 統合の例

```hcl
module "lambda" {
  source = "../../modules/lambda"

  function_name = "feed-bower-api"
  image_uri     = var.image_uri

  vpc_config = {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  # その他の設定...
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| function_name | Lambda 関数名 | string | - | yes |
| image_uri | ECR イメージ URI | string | - | yes |
| memory_size | Lambda メモリサイズ (MB) | number | 512 | no |
| timeout | Lambda タイムアウト (秒) | number | 30 | no |
| environment_variables | 環境変数 | map(string) | {} | no |
| vpc_config | VPC 設定 | object | null | no |
| dynamodb_table_arns | DynamoDB テーブル ARN のリスト | list(string) | [] | no |
| enable_bedrock | Bedrock アクセスを有効化 | bool | false | no |
| log_retention_days | CloudWatch Logs 保持期間 (日) | number | 7 | no |
| create_alias | production エイリアスを作成 | bool | false | no |
| provisioned_concurrent_executions | Provisioned Concurrency の実行数 | number | 0 | no |
| tags | リソースタグ | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| function_arn | Lambda 関数 ARN |
| function_name | Lambda 関数名 |
| function_invoke_arn | Lambda 関数 Invoke ARN |
| function_version | Lambda 関数バージョン |
| role_arn | Lambda 実行ロール ARN |
| role_name | Lambda 実行ロール名 |
| log_group_name | CloudWatch Logs グループ名 |
| alias_arn | Lambda エイリアス ARN |

## 注意事項

- ECR イメージは事前にプッシュしておく必要があります
- VPC 統合を使用する場合、NAT Gateway が必要です
- Provisioned Concurrency はコストが高いため、本番環境のみ推奨
- Bedrock を使用する場合、リージョンの対応状況を確認してください
