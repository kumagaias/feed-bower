# Bedrock Agent Terraform Module

このモジュールは、Amazon Bedrock Agent統合のためのLambda関数をデプロイします。

## 概要

このモジュールは以下のリソースを作成します：

- Lambda関数（フィード検索executor）- ECRコンテナイメージ
- Lambda実行用のIAMロール
- CloudWatch Logsグループ
- 必要なIAM権限

## 使用方法

```hcl
module "bedrock_agent" {
  source = "../../modules/bedrock-agent"

  environment         = "production"
  project_name        = "feed-bower"
  image_uri           = "${aws_ecr_repository.lambda.repository_url}:latest"
  lambda_timeout      = 30
  lambda_memory       = 256
  log_retention_days  = 7

  tags = {
    Environment = "production"
    Project     = "feed-bower"
  }
}
```

## 入力変数

| 変数名 | 説明 | 型 | デフォルト値 | 必須 |
|--------|------|-----|-------------|------|
| environment | 環境名 (dev, staging, production) | string | - | Yes |
| project_name | プロジェクト名 | string | "feed-bower" | No |
| image_uri | ECRイメージURI | string | - | Yes |
| lambda_timeout | Lambda関数タイムアウト (秒) | number | 30 | No |
| lambda_memory | Lambda関数メモリ (MB) | number | 256 | No |
| log_retention_days | CloudWatch Logs保持期間 (日) | number | 7 | No |
| tags | リソースタグ | map(string) | {} | No |

## 出力

| 出力名 | 説明 |
|--------|------|
| lambda_function_arn | Lambda関数ARN |
| lambda_function_name | Lambda関数名 |
| lambda_role_arn | Lambda実行ロールARN |
| lambda_log_group_name | CloudWatch LogsグループARN |

## Lambda関数

Lambda関数はECRコンテナイメージとしてデプロイされます。

### ディレクトリ構造

```
lambda/
├── Dockerfile            # コンテナイメージ定義
├── index.js              # メインハンドラー
├── feed-database.json    # 厳選されたフィードデータベース
└── package.json          # 依存関係
```

### イメージのビルドとプッシュ

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージをビルド
cd lambda
docker build -t feed-bower-bedrock-lambda .

# タグ付け
docker tag feed-bower-bedrock-lambda:latest \
  <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/feed-bower-bedrock-lambda:latest

# プッシュ
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/feed-bower-bedrock-lambda:latest
```

### フィードデータベースの更新

`lambda/feed-database.json`を更新して、新しいフィードを追加できます。変更後、イメージを再ビルドしてプッシュします。

```bash
cd lambda
docker build -t feed-bower-bedrock-lambda .
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/feed-bower-bedrock-lambda:latest
```

## 要件

- Terraform >= 1.0.0
- AWS Provider ~> 6.17
- Docker（イメージビルド用）

## 注意事項

- Lambda関数はNode.js 20.xベースイメージを使用します
- デフォルトのタイムアウトは30秒です
- デフォルトのメモリは256MBです
- CloudWatch Logsの保持期間はデフォルトで7日間です
- ECRイメージURIは必須パラメータです
