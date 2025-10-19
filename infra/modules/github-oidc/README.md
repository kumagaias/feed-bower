# GitHub OIDC Module

GitHub Actions から AWS にアクセスするための OIDC プロバイダーと IAM ロールを作成します。

## 機能

- GitHub OIDC プロバイダーの作成
- GitHub Actions 用 IAM ロールの作成
- ECR へのアクセス権限
- Lambda へのアクセス権限

## 使用例

```hcl
module "github_oidc_development" {
  source = "../../modules/github-oidc"

  role_name          = "GitHubActions-FeedBower-Development"
  github_repository  = "owner/repo"
  branch_name        = "develop"
  ecr_repository_arns = [module.ecr.repository_arn]
  lambda_function_arns = [module.lambda.function_arn]

  tags = {
    Environment = "development"
    Project     = "feed-bower"
  }
}
```

## 入力変数

| 変数名 | 説明 | 型 | 必須 |
|--------|------|-----|------|
| role_name | IAM ロール名 | string | Yes |
| github_repository | GitHub リポジトリ（例: owner/repo） | string | Yes |
| branch_name | デプロイ対象のブランチ名 | string | Yes |
| ecr_repository_arns | ECR リポジトリの ARN リスト | list(string) | Yes |
| lambda_function_arns | Lambda 関数の ARN リスト | list(string) | Yes |
| tags | リソースに付与するタグ | map(string) | No |

## 出力値

| 出力名 | 説明 |
|--------|------|
| oidc_provider_arn | GitHub OIDC プロバイダーの ARN |
| role_arn | GitHub Actions 用 IAM ロールの ARN |
| role_name | GitHub Actions 用 IAM ロール名 |

## セキュリティ

- OIDC を使用することで、長期的な認証情報（アクセスキー）を保存する必要がありません
- 特定のブランチからのみアクセスを許可
- 最小権限の原則に基づいた権限設定

## 注意事項

- OIDC プロバイダーは AWS アカウントごとに1つのみ作成されます
- 複数の環境で同じ OIDC プロバイダーを共有します
- IAM ロールは環境ごとに作成されます
