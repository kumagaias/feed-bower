# Feed Bower - 本番環境デプロイ手順

このディレクトリには、Feed Bower の本番環境（production）用の Terraform 設定が含まれています。

## 前提条件

1. **ドメインの準備**
   - `feed-bower.net` ドメインを取得済み
   - Route 53 でホストゾーンを作成済み
   - SSL 証明書を ACM で取得済み（us-east-1 リージョン）

2. **Terraform のインストール**
   ```bash
   # Homebrew を使用する場合
   brew install terraform
   
   # バージョン確認
   terraform version  # >= 1.0.0
   ```

2. **AWS CLI の設定**
   ```bash
   # AWS CLI のインストール
   brew install awscli
   
   # AWS 認証情報の設定
   aws configure
   # AWS Access Key ID: [your-access-key]
   # AWS Secret Access Key: [your-secret-key]
   # Default region name: ap-northeast-1
   # Default output format: json
   ```

3. **GitHub Personal Access Token の取得**
   - GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - "Generate new token (classic)" をクリック
   - スコープ: `repo`, `admin:repo_hook` を選択
   - トークンをコピーして保存

## セットアップ手順

### 1. S3 バケットの作成（Terraform ステート保存用）

Terraform のステートファイルを S3 に保存するため、事前にバケットを作成します。

**方法 1: スクリプトを使用（推奨）**

```bash
# プロジェクトルートから実行
bash scripts/create-s3-backend.sh production

# または環境変数で指定
AWS_REGION=ap-northeast-1 bash scripts/create-s3-backend.sh production
```

**方法 2: 手動で作成**

```bash
# S3 バケットを作成
aws s3api create-bucket \
  --bucket feed-bower-terraform-state-dev \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1

# バージョニングを有効化（ステートファイルの履歴管理）
aws s3api put-bucket-versioning \
  --bucket feed-bower-terraform-state-dev \
  --versioning-configuration Status=Enabled

# 暗号化を有効化
aws s3api put-bucket-encryption \
  --bucket feed-bower-terraform-state-dev \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# パブリックアクセスをブロック
aws s3api put-public-access-block \
  --bucket feed-bower-terraform-state-dev \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# バケットが作成されたことを確認
aws s3 ls | grep feed-bower-terraform-state-dev
```

**注意**: バケット名はグローバルで一意である必要があります。既に使用されている場合は、別の名前に変更してください。

### 2. 設定ファイルの作成

```bash
cd infra/environments/dev

# terraform.tfvars ファイルを作成
cp terraform.tfvars.example terraform.tfvars

# terraform.tfvars を編集
vim terraform.tfvars
```

`terraform.tfvars` の内容を編集：

```hcl
aws_region = "ap-northeast-1"
github_repository = "https://github.com/your-username/feed-bower"
github_token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. Terraform の初期化

```bash
terraform init
```

このコマンドで以下が実行されます：
- プロバイダー（AWS）のダウンロード
- モジュールの初期化
- ローカルバックエンドの設定

### 4. S3 バックエンドへの移行（推奨）

初回デプロイ後、ステートファイルを S3 に移行することを推奨します。

```bash
# main.tf の backend "s3" ブロックのコメントを外す
vim main.tf

# 以下のコメントを外す：
# backend "s3" {
#   bucket         = "feed-bower-terraform-state-dev"
#   key            = "dev/terraform.tfstate"
#   region         = "ap-northeast-1"
#   encrypt        = true
#   use_lockfile   = true
# }

# ステートファイルを S3 に移行
terraform init -migrate-state

# 確認プロンプトで "yes" と入力
```

**use_lockfile の利点**:
- ✅ DynamoDB テーブルが不要（コスト削減）
- ✅ S3 のロックファイル機能を使用（`.terraform.lock.info`）
- ✅ 複数人での同時実行を防止
- ✅ シンプルな構成（S3 バケットのみ）
- ✅ Terraform 1.9.0 以降で利用可能

**従来の方法との比較**:

| 項目 | use_lockfile = true | DynamoDB ロック |
|------|---------------------|----------------|
| 必要なリソース | S3 のみ | S3 + DynamoDB |
| 月額コスト | ~$0.02 | ~$0.27 |
| セットアップ | 簡単 | やや複雑 |
| ロック機能 | ✅ | ✅ |

### 5. 実行計画の確認

```bash
terraform plan
```

このコマンドで作成されるリソースを確認できます：
- ECR リポジトリ × 1
- DynamoDB テーブル × 6
- Lambda 関数 × 1
- API Gateway × 1
- Amplify アプリ × 1

### 6. Lambda イメージのビルドとプッシュ

**重要**: Lambda 関数をデプロイする前に、Docker イメージを ECR にプッシュする必要があります。

```bash
# ECR リポジトリ URL を取得（terraform apply 後）
ECR_URL=$(terraform output -raw ecr_repository_url)

# AWS ECR にログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# プロジェクトルートに移動
cd ../../../

# Docker イメージをビルド
docker build -t feed-bower-api-production -f api/Dockerfile .

# イメージにタグを付ける
docker tag feed-bower-api-production:latest $ECR_URL:latest

# ECR にプッシュ
docker push $ECR_URL:latest
```

### 7. リソースのデプロイ

```bash
cd infra/environments/dev

# リソースをデプロイ
terraform apply
```

確認プロンプトが表示されたら `yes` と入力します。

デプロイには 5〜10 分程度かかります。

### 8. デプロイ結果の確認

```bash
# すべての出力を表示
terraform output

# 特定の出力を表示
terraform output api_gateway_url
terraform output amplify_default_domain
```

出力例：
```
api_gateway_url = "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev"
amplify_default_domain = "xxxxxxxxxxxxxx.amplifyapp.com"
amplify_branch_urls = {
  "develop" = "https://develop.xxxxxxxxxxxxxx.amplifyapp.com"
}
```

## デプロイされるリソース

### DynamoDB テーブル

| テーブル名 | ハッシュキー | レンジキー | GSI |
|-----------|------------|-----------|-----|
| feed-bower-users-dev | user_id | - | EmailIndex |
| feed-bower-bowers-dev | bower_id | - | UserIdIndex |
| feed-bower-feeds-dev | feed_id | - | BowerIdIndex |
| feed-bower-articles-dev | article_id | - | FeedIdPublishedAtIndex |
| feed-bower-liked-articles-dev | user_id | article_id | - |
| feed-bower-chick-stats-dev | user_id | - | - |

### Lambda 関数

- **関数名**: `feed-bower-api-dev`
- **メモリ**: 512 MB
- **タイムアウト**: 30 秒
- **ランタイム**: Container (ECR イメージ)

### API Gateway

- **ステージ**: dev
- **CORS**: 有効（localhost:3000, *.amplifyapp.com）
- **スロットリング**: バースト 100, レート 50

### Amplify Hosting

- **ブランチ**: develop
- **自動ビルド**: 有効
- **フレームワーク**: Next.js - SSR

## 動作確認

### API Gateway のテスト

```bash
# API エンドポイントを取得
API_URL=$(terraform output -raw api_gateway_url)

# ヘルスチェック
curl $API_URL/health

# 期待されるレスポンス
# {"status":"ok","environment":"dev"}
```

### Amplify のテスト

```bash
# Amplify URL を取得
AMPLIFY_URL=$(terraform output -json amplify_branch_urls | jq -r '.develop')

# ブラウザで開く
open $AMPLIFY_URL
```

### AWS コンソールでの確認

1. **DynamoDB**: https://console.aws.amazon.com/dynamodb/
2. **Lambda**: https://console.aws.amazon.com/lambda/
3. **API Gateway**: https://console.aws.amazon.com/apigateway/
4. **Amplify**: https://console.aws.amazon.com/amplify/

## トラブルシューティング

### エラー: "Error creating S3 bucket"

**原因**: バケット名が既に使用されている（S3 バケット名はグローバルで一意）

**解決方法**:
```bash
# 別のバケット名を使用
# main.tf の backend "s3" ブロックと create-s3-backend.sh のバケット名を変更
# 例: feed-bower-terraform-state-dev-YOUR_NAME
```

### エラー: "Error acquiring the state lock"

**原因**: 別のプロセスが Terraform を実行中、またはロックファイルが残っている

**解決方法**:
```bash
# S3 バケット内のロックファイルを確認
aws s3 ls s3://feed-bower-terraform-state-dev/ --recursive | grep lock

# ロックファイルを削除（他のプロセスが実行中でないことを確認してから）
aws s3 rm s3://feed-bower-terraform-state-dev/.terraform.lock.info

# または強制的にロックを解除
terraform force-unlock <LOCK_ID>
```

### Lambda 関数が起動しない

**原因**: ECR イメージがプッシュされていない

**解決方法**:
```bash
# ECR にイメージをプッシュ（上記の手順 4 を参照）
# その後、Lambda 関数を更新
terraform apply -replace=module.lambda.aws_lambda_function.function
```

### Amplify ビルドが失敗する

**原因**: GitHub トークンが無効、またはリポジトリへのアクセス権限がない

**解決方法**:
1. GitHub トークンのスコープを確認（`repo`, `admin:repo_hook`）
2. トークンを再生成して `terraform.tfvars` を更新
3. `terraform apply` を再実行

### API Gateway が 502 エラーを返す

**原因**: Lambda 関数が正しく動作していない

**解決方法**:
```bash
# Lambda ログを確認
aws logs tail /aws/lambda/feed-bower-api-dev --follow

# Lambda 関数を直接テスト
aws lambda invoke --function-name feed-bower-api-dev \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json
cat response.json
```

## リソースの削除

開発環境を削除する場合：

```bash
# すべてのリソースを削除
terraform destroy

# 確認プロンプトで yes と入力
```

**注意**: DynamoDB テーブルのデータも削除されます。必要に応じてバックアップを取ってください。

## 次のステップ

1. **API のテスト**: Postman や curl で API エンドポイントをテスト
2. **フロントエンドの設定**: Amplify の環境変数に API URL を設定
3. **CI/CD の設定**: GitHub Actions で自動デプロイを設定
4. **モニタリング**: CloudWatch でログとメトリクスを確認

## 参考リンク

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [AWS Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
