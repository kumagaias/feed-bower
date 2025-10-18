# DynamoDB モジュール

DynamoDB テーブルを作成するモジュール。

## 機能

- DynamoDB テーブルの作成
- Global Secondary Index (GSI) のサポート
- Local Secondary Index (LSI) のサポート
- TTL 設定
- ポイントインタイムリカバリ
- サーバーサイド暗号化
- DynamoDB Streams
- Auto Scaling（プロビジョンドモードのみ）
- オンデマンド課金とプロビジョンド課金の両方に対応

## 使用例

### オンデマンド課金（開発環境推奨）

```hcl
module "users_table" {
  source = "../../modules/dynamodb"

  table_name   = "Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

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
      name     = "EmailIndex"
      hash_key = "email"
    }
  ]

  point_in_time_recovery_enabled = true
  encryption_enabled             = true

  tags = {
    Environment = "dev"
    Project     = "feed-bower"
  }
}
```

### プロビジョンド課金 + Auto Scaling（本番環境推奨）

```hcl
module "articles_table" {
  source = "../../modules/dynamodb"

  table_name   = "Articles"
  billing_mode = "PROVISIONED"
  hash_key     = "article_id"

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

  read_capacity  = 10
  write_capacity = 10

  global_secondary_indexes = [
    {
      name           = "FeedIdPublishedAtIndex"
      hash_key       = "feed_id"
      range_key      = "published_at"
      read_capacity  = 5
      write_capacity = 5
    }
  ]

  autoscaling_enabled            = true
  autoscaling_read_max_capacity  = 100
  autoscaling_write_max_capacity = 100
  autoscaling_read_target_value  = 70
  autoscaling_write_target_value = 70

  point_in_time_recovery_enabled = true
  encryption_enabled             = true

  tags = {
    Environment = "prod"
    Project     = "feed-bower"
  }
}
```

### DynamoDB Streams 有効化

```hcl
module "bowers_table" {
  source = "../../modules/dynamodb"

  table_name   = "Bowers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "bower_id"

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
      name     = "UserIdIndex"
      hash_key = "user_id"
    }
  ]

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Environment = "dev"
    Project     = "feed-bower"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| table_name | DynamoDB テーブル名 | string | - | yes |
| billing_mode | 課金モード (PROVISIONED または PAY_PER_REQUEST) | string | PAY_PER_REQUEST | no |
| hash_key | パーティションキー | string | - | yes |
| range_key | ソートキー | string | null | no |
| attributes | 属性定義 | list(object) | - | yes |
| read_capacity | 読み取りキャパシティユニット | number | 5 | no |
| write_capacity | 書き込みキャパシティユニット | number | 5 | no |
| global_secondary_indexes | Global Secondary Index の定義 | list(object) | [] | no |
| local_secondary_indexes | Local Secondary Index の定義 | list(object) | [] | no |
| ttl_enabled | TTL を有効化 | bool | false | no |
| ttl_attribute_name | TTL 属性名 | string | ttl | no |
| point_in_time_recovery_enabled | ポイントインタイムリカバリを有効化 | bool | false | no |
| encryption_enabled | サーバーサイド暗号化を有効化 | bool | true | no |
| kms_key_arn | KMS キー ARN | string | null | no |
| stream_enabled | DynamoDB Streams を有効化 | bool | false | no |
| stream_view_type | ストリームビュータイプ | string | NEW_AND_OLD_IMAGES | no |
| autoscaling_enabled | Auto Scaling を有効化 | bool | false | no |
| autoscaling_read_max_capacity | 読み取りキャパシティの最大値 | number | 100 | no |
| autoscaling_write_max_capacity | 書き込みキャパシティの最大値 | number | 100 | no |
| autoscaling_read_target_value | 読み取りキャパシティの目標使用率（%） | number | 70 | no |
| autoscaling_write_target_value | 書き込みキャパシティの目標使用率（%） | number | 70 | no |
| tags | リソースタグ | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| table_id | DynamoDB テーブル ID |
| table_arn | DynamoDB テーブル ARN |
| table_name | DynamoDB テーブル名 |
| stream_arn | DynamoDB Streams ARN |
| stream_label | DynamoDB Streams ラベル |

## 注意事項

- 属性定義には、キーとインデックスで使用する属性のみを含めてください
- GSI は最大 20 個まで作成可能
- LSI は最大 5 個まで作成可能（テーブル作成時のみ）
- Auto Scaling はプロビジョンドモードでのみ使用可能
- ポイントインタイムリカバリは本番環境で推奨
- 暗号化はデフォルトで有効（AWS 管理キー使用）
