# 環境名とリソース命名規則

## 概要

Feed Bower プロジェクトでは、AWS リソース名に環境名のサフィックスを付けることで、development と production 環境を区別しています。

## 環境名

- `development` - 開発環境（デフォルト）
- `production` - 本番環境

## リソース命名規則

### DynamoDB テーブル

全ての DynamoDB テーブル名には環境名のサフィックスが付きます：

```
{テーブル名}-{環境名}
```

**例:**
- `Users-development`
- `Users-production`
- `Bowers-development`
- `Bowers-production`
- `Feeds-development`
- `Feeds-production`
- `Articles-development`
- `Articles-production`
- `LikedArticles-development`
- `LikedArticles-production`
- `ChickStats-development`
- `ChickStats-production`

### Lambda 関数

```
feed-bower-api-{環境名}
```

**例:**
- `feed-bower-api-development`
- `feed-bower-api-production`

### API Gateway

```
feed-bower-api-{環境名}
```

**例:**
- `feed-bower-api-development`
- `feed-bower-api-production`

### Amplify アプリ

```
feed-bower-{環境名}
```

**例:**
- `feed-bower-development`
- `feed-bower-production`

### ECR リポジトリ

```
feed-bower-api-{環境名}
```

**例:**
- `feed-bower-api-development`
- `feed-bower-api-production`

各環境で独立した ECR リポジトリを使用します。

### S3 バケット（Terraform State）

```
feed-bower-terraform-state-{環境名}
```

**例:**
- `feed-bower-terraform-state-development`
- `feed-bower-terraform-state-production`

## スクリプトでの環境名の使用

### 環境変数の設定

スクリプトを実行する前に、環境変数 `ENVIRONMENT` を設定します：

```bash
# development 環境（デフォルト）
export ENVIRONMENT=development

# production 環境
export ENVIRONMENT=production
```

### DynamoDB テーブル作成

```bash
# development 環境
ENVIRONMENT=development ./scripts/create-dynamodb-tables.sh

# production 環境
ENVIRONMENT=production ./scripts/create-dynamodb-tables.sh
```

### テーブル検証

```bash
# development 環境
ENVIRONMENT=development ./scripts/verify-dynamodb-tables.sh

# production 環境
ENVIRONMENT=production ./scripts/verify-dynamodb-tables.sh
```

### 開発用ユーザー作成

```bash
# development 環境
ENVIRONMENT=development ./scripts/create-dev-user.sh

# production 環境（通常は使用しない）
ENVIRONMENT=production ./scripts/create-dev-user.sh
```

## Terraform での環境名の使用

Terraform では、各環境ディレクトリ内の `locals` ブロックで環境名が定義されています：

```hcl
locals {
  project_name = "feed-bower"
  environment  = "development"  # または "production"
  
  table_names = {
    users = "${local.project_name}-users-${local.environment}"
    # ...
  }
}
```

## ローカル開発環境

ローカル開発では、DynamoDB Local を使用します。デフォルトでは `development` 環境のテーブル名が使用されます。

```bash
# DynamoDB Local でテーブル作成
./scripts/create-dynamodb-tables.sh

# または明示的に指定
ENVIRONMENT=development ./scripts/create-dynamodb-tables.sh
```

## 注意事項

1. **環境変数が未設定の場合**: スクリプトはデフォルトで `development` 環境を使用します
2. **テーブル名の一貫性**: バックエンドコードでも同じ命名規則を使用してください
3. **本番環境での注意**: production 環境では、慎重にスクリプトを実行してください

## バックエンドコードでの使用

バックエンドコードでは、環境変数からテーブル名を構築します：

```go
// 環境変数から取得
environment := os.Getenv("ENVIRONMENT") // "development" または "production"
tablePrefix := os.Getenv("DYNAMODB_TABLE_PREFIX") // "feed-bower-"
tableSuffix := os.Getenv("DYNAMODB_TABLE_SUFFIX") // "-development" または "-production"

// テーブル名を構築
usersTable := tablePrefix + "users" + tableSuffix
// 結果: "feed-bower-users-development" または "feed-bower-users-production"
```

## 将来の拡張

現在は 1 つの AWS アカウントで development と production を管理していますが、将来的には以下のように分離する予定です：

- **Development アカウント**: 開発・テスト用
- **Production アカウント**: 本番環境用

その場合でも、リソース名の命名規則は同じままです。
