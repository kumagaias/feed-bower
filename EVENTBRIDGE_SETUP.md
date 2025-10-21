# EventBridge スケジューラー設定手順

## 概要
フィードの記事を1時間ごとに自動取得するEventBridgeスケジューラーを設定しました。

## 実装内容

### 1. Lambda関数の更新
- EventBridgeイベントを処理できるように`back/cmd/lambda/main.go`を更新
- `mode: "scheduler"`イベントを受信すると、スケジューラーモードで実行

### 2. Terraformの更新
- `infra/environments/production/main.tf`にEventBridgeモジュールを追加
- スケジュール: `rate(1 hour)` - 1時間ごとに実行
- Bedrock Lambda用のECRリポジトリとIAM権限を追加

## デプロイ手順

### ステップ1: Terraformでインフラを更新

```bash
cd infra/environments/production

# 既存のECRリポジトリをインポート（初回のみ）
terraform import module.ecr_bedrock_lambda.aws_ecr_repository.repository feed-bower-bedrock-lambda-production

# 変更を確認
terraform plan

# 適用
terraform apply
```

### ステップ2: 更新されたLambda関数をデプロイ

コードの変更をGitHubにプッシュすると、GitHub Actionsが自動的にビルド＆デプロイします：

```bash
git push origin feat/feed-scheduler
```

または、手動でDockerイメージをビルド＆プッシュ：

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  843925270284.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージをビルド（x86_64アーキテクチャ）
cd back
docker buildx build --platform linux/amd64 \
  -t 843925270284.dkr.ecr.ap-northeast-1.amazonaws.com/feed-bower-api-production:latest \
  --push .
```

### ステップ3: 動作確認

```bash
# EventBridgeルールの確認
aws events describe-rule \
  --name feed-bower-feed-fetch-schedule-production \
  --region ap-northeast-1

# Lambda関数を手動で実行してテスト
aws lambda invoke \
  --function-name feed-bower-api-production \
  --payload '{"mode":"scheduler"}' \
  --region ap-northeast-1 \
  /tmp/scheduler-test.json

# 結果を確認
cat /tmp/scheduler-test.json

# CloudWatchログを確認
aws logs tail /aws/lambda/feed-bower-api-production \
  --since 5m \
  --region ap-northeast-1
```

## スケジュール設定

現在の設定: **1時間ごと** (`rate(1 hour)`)

変更したい場合は、`infra/environments/production/main.tf`の`schedule_expression`を編集：

```hcl
module "eventbridge" {
  # ...
  schedule_expression = "rate(1 hour)"  # または "cron(0 * * * ? *)"
}
```

### スケジュール例

- `rate(30 minutes)` - 30分ごと
- `rate(2 hours)` - 2時間ごと
- `cron(0 */6 * * ? *)` - 6時間ごと（0時、6時、12時、18時）
- `cron(0 9 * * ? *)` - 毎日9時（UTC）

## トラブルシューティング

### EventBridgeが実行されない

1. EventBridgeルールが有効か確認：
```bash
aws events describe-rule --name feed-bower-feed-fetch-schedule-production --region ap-northeast-1
```

2. Lambda関数の権限を確認：
```bash
aws lambda get-policy --function-name feed-bower-api-production --region ap-northeast-1
```

### スケジューラーがエラーを返す

CloudWatchログを確認：
```bash
aws logs tail /aws/lambda/feed-bower-api-production --follow --region ap-northeast-1
```

### 記事が取得されない

1. フィードが登録されているか確認
2. DynamoDBテーブルにアクセス権限があるか確認
3. Lambda関数のタイムアウト設定を確認（現在30秒）

## 次のステップ

1. ✅ Terraformでインフラを更新
2. ✅ Lambda関数のコードをデプロイ
3. ⏳ 動作確認
4. ⏳ 1時間後に記事が自動取得されることを確認

## 関連ファイル

- `back/cmd/lambda/main.go` - Lambda関数のエントリーポイント
- `back/internal/service/scheduler_service.go` - スケジューラーサービス
- `infra/modules/eventbridge/` - EventBridgeモジュール
- `infra/environments/production/main.tf` - Production環境設定
