# ECR モジュール

Docker コンテナイメージを保存する ECR リポジトリを作成するモジュール。

## 機能

- ECR リポジトリの作成
- イメージスキャン（脆弱性検出）
- 暗号化設定（AES256 または KMS）
- ライフサイクルポリシー（古いイメージの自動削除）
- クロスアカウントアクセス
- リージョン間レプリケーション

## 使用例

### 基本的な使用方法

```hcl
module "ecr" {
  source = "../../modules/ecr"

  repository_name      = "feed-bower-api"
  image_tag_mutability = "MUTABLE"
  scan_on_push         = true

  enable_lifecycle_policy        = true
  max_image_count                = 10
  untagged_image_retention_days  = 7

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### KMS 暗号化の使用

```hcl
module "ecr" {
  source = "../../modules/ecr"

  repository_name = "feed-bower-api"
  encryption_type = "KMS"
  kms_key_arn     = aws_kms_key.ecr.arn

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### クロスアカウントアクセスの設定

```hcl
module "ecr" {
  source = "../../modules/ecr"

  repository_name = "feed-bower-api"

  # 他の AWS アカウントからのプルを許可
  allowed_account_ids = [
    "123456789012",  # 開発アカウント
    "234567890123"   # ステージングアカウント
  ]

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### リージョン間レプリケーション

```hcl
module "ecr" {
  source = "../../modules/ecr"

  repository_name = "feed-bower-api"

  # 他のリージョンにレプリケート
  replication_regions = [
    "us-west-2",
    "eu-west-1"
  ]

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### イメージタグを不変にする（本番環境推奨）

```hcl
module "ecr" {
  source = "../../modules/ecr"

  repository_name      = "feed-bower-api"
  image_tag_mutability = "IMMUTABLE"  # タグの上書きを禁止

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

## Docker イメージのプッシュ方法

```bash
# ECR にログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <registry_id>.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージをビルド
docker build -t feed-bower-api:latest .

# イメージにタグ付け
docker tag feed-bower-api:latest <repository_url>:latest
docker tag feed-bower-api:latest <repository_url>:$(git rev-parse --short HEAD)

# イメージをプッシュ
docker push <repository_url>:latest
docker push <repository_url>:$(git rev-parse --short HEAD)
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| repository_name | ECR リポジトリ名 | string | - | yes |
| image_tag_mutability | イメージタグの可変性 (MUTABLE または IMMUTABLE) | string | MUTABLE | no |
| scan_on_push | プッシュ時にイメージスキャンを実行 | bool | true | no |
| encryption_type | 暗号化タイプ (AES256 または KMS) | string | AES256 | no |
| kms_key_arn | KMS キー ARN | string | null | no |
| enable_lifecycle_policy | ライフサイクルポリシーを有効化 | bool | true | no |
| max_image_count | 保持する最大イメージ数 | number | 10 | no |
| untagged_image_retention_days | タグなしイメージの保持期間（日） | number | 7 | no |
| allowed_account_ids | クロスアカウントアクセスを許可する AWS アカウント ID のリスト | list(string) | [] | no |
| replication_regions | レプリケーション先リージョンのリスト | list(string) | [] | no |
| tags | リソースタグ | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| repository_arn | ECR リポジトリ ARN |
| repository_url | ECR リポジトリ URL |
| repository_name | ECR リポジトリ名 |
| registry_id | ECR レジストリ ID |

## 注意事項

- イメージスキャンは脆弱性検出に役立ちますが、完全ではありません
- ライフサイクルポリシーは古いイメージを自動削除するため、必要なイメージは適切にタグ付けしてください
- IMMUTABLE タグを使用すると、同じタグでの上書きができなくなります（本番環境推奨）
- KMS 暗号化を使用すると追加コストが発生します
- レプリケーションを使用すると追加コストが発生します
- クロスアカウントアクセスを設定する場合、IAM ロールも適切に設定してください
