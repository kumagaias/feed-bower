# Amplify モジュール

Next.js アプリケーションをホスティングする AWS Amplify を作成するモジュール。

## 機能

- Amplify アプリケーションの作成
- Git リポジトリとの統合
- 自動ビルド・デプロイ
- 複数ブランチのサポート
- カスタムドメイン設定
- 環境変数の管理
- 基本認証（オプション）
- プルリクエストプレビュー
- Webhook トリガー
- SPA リダイレクト

## 使用例

### 基本的な使用方法

```hcl
module "amplify" {
  source = "../../modules/amplify"

  app_name       = "feed-bower"
  repository_url = "https://github.com/your-org/feed-bower"

  node_version     = "24"
  build_command    = "npm run build"
  output_directory = ".next"

  environment_variables = {
    NEXT_PUBLIC_API_URL = "https://api.feed-bower.net"
    NODE_ENV            = "production"
  }

  branches = {
    main = {
      stage                       = "PRODUCTION"
      enable_auto_build           = true
      enable_pull_request_preview = false
    }
    develop = {
      stage                       = "DEVELOPMENT"
      enable_auto_build           = true
      enable_pull_request_preview = true
      environment_variables = {
        NEXT_PUBLIC_API_URL = "https://api-dev.feed-bower.net"
      }
    }
  }

  enable_spa_redirect = true

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### カスタムドメインの設定

```hcl
module "amplify" {
  source = "../../modules/amplify"

  app_name       = "feed-bower"
  repository_url = "https://github.com/your-org/feed-bower"

  custom_domain = "feed-bower.net"

  domain_config = [
    {
      branch_name = "main"
      prefix      = ""  # feed-bower.net
    },
    {
      branch_name = "main"
      prefix      = "www"  # www.feed-bower.net
    },
    {
      branch_name = "develop"
      prefix      = "dev"  # dev.feed-bower.net
    }
  ]

  wait_for_domain_verification = true

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### 基本認証の有効化（開発環境）

```hcl
module "amplify" {
  source = "../../modules/amplify"

  app_name       = "feed-bower-dev"
  repository_url = "https://github.com/your-org/feed-bower"

  enable_basic_auth    = true
  basic_auth_username  = "admin"
  basic_auth_password  = var.basic_auth_password  # Secrets Manager から取得推奨

  branches = {
    develop = {
      stage             = "DEVELOPMENT"
      enable_auto_build = true
    }
  }

  tags = {
    Environment = "dev"
    Project     = "feed-bower"
  }
}
```

### プルリクエストプレビューの有効化

```hcl
module "amplify" {
  source = "../../modules/amplify"

  app_name       = "feed-bower"
  repository_url = "https://github.com/your-org/feed-bower"

  enable_auto_branch_creation   = true
  auto_branch_creation_patterns = ["feature/*", "bugfix/*"]
  enable_pull_request_preview   = true

  branches = {
    main = {
      stage                       = "PRODUCTION"
      enable_auto_build           = true
      enable_pull_request_preview = true
      pull_request_environment_name = "pr"
    }
  }

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### Webhook の設定

```hcl
module "amplify" {
  source = "../../modules/amplify"

  app_name       = "feed-bower"
  repository_url = "https://github.com/your-org/feed-bower"

  branches = {
    main = {
      stage             = "PRODUCTION"
      enable_auto_build = true
    }
  }

  webhooks = {
    main = {
      branch_name = "main"
      description = "Webhook for main branch"
    }
  }

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}

# Webhook URL を GitHub Actions で使用
output "webhook_url" {
  value     = module.amplify.webhook_urls["main"]
  sensitive = true
}
```

### カスタムビルド仕様

```hcl
module "amplify" {
  source = "../../modules/amplify"

  app_name       = "feed-bower"
  repository_url = "https://github.com/your-org/feed-bower"

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - nvm use 24
            - npm ci
            - npm run lint
        build:
          commands:
            - npm run build
            - npm run test
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
  EOT

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| app_name | Amplify アプリケーション名 | string | - | yes |
| repository_url | Git リポジトリ URL | string | - | yes |
| build_spec | カスタムビルド仕様（YAML 形式） | string | null | no |
| node_version | Node.js バージョン | string | 24 | no |
| build_command | ビルドコマンド | string | npm run build | no |
| output_directory | ビルド出力ディレクトリ | string | .next | no |
| environment_variables | 環境変数 | map(string) | {} | no |
| enable_spa_redirect | SPA リダイレクトを有効化 | bool | true | no |
| custom_headers | カスタムヘッダー設定 | list(object) | [] | no |
| enable_basic_auth | 基本認証を有効化 | bool | false | no |
| basic_auth_username | 基本認証ユーザー名 | string | "" | no |
| basic_auth_password | 基本認証パスワード | string | "" | no |
| enable_auto_branch_creation | 自動ブランチ作成を有効化 | bool | false | no |
| auto_branch_creation_patterns | 自動ブランチ作成パターン | list(string) | ["feature/*", "bugfix/*"] | no |
| enable_pull_request_preview | プルリクエストプレビューを有効化 | bool | false | no |
| iam_service_role_arn | Amplify サービスロール ARN | string | null | no |
| branches | ブランチ設定 | map(object) | {} | no |
| custom_domain | カスタムドメイン名 | string | null | no |
| domain_config | ドメイン設定 | list(object) | [] | no |
| wait_for_domain_verification | ドメイン検証の完了を待つ | bool | true | no |
| webhooks | Webhook 設定 | map(object) | {} | no |
| tags | リソースタグ | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| app_id | Amplify アプリケーション ID |
| app_arn | Amplify アプリケーション ARN |
| default_domain | Amplify デフォルトドメイン |
| branch_urls | ブランチごとの URL |
| custom_domain | カスタムドメイン名 |
| webhook_urls | Webhook URL |
| service_role_arn | Amplify サービスロール ARN |

## 注意事項

- Git リポジトリへのアクセス権限が必要です（GitHub、GitLab、Bitbucket など）
- カスタムドメインを使用する場合、DNS 設定が必要です
- 基本認証のパスワードは Secrets Manager で管理することを推奨します
- プルリクエストプレビューは追加コストが発生します
- Webhook URL は機密情報として扱ってください
- Next.js の SSR を使用する場合、Amplify Hosting が対応していることを確認してください
- ビルド時間が長い場合、タイムアウト設定を調整してください
