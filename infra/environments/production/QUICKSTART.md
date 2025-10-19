# クイックスタートガイド

このガイドでは、Feed Bower の開発環境を最短でデプロイする手順を説明します。

## 前提条件チェック

```bash
# Terraform がインストールされているか確認
terraform version
# 出力例: Terraform v1.0.0 以上

# AWS CLI がインストールされているか確認
aws --version
# 出力例: aws-cli/2.x.x

# AWS 認証情報が設定されているか確認
aws sts get-caller-identity
# 出力例: アカウント ID、ユーザー ARN が表示される
```

## 7 ステップでデプロイ

### ステップ 1: S3 バケットの作成

**簡単な方法: スクリプトを使用**

```bash
# プロジェクトルートから実行
bash scripts/create-s3-backend.sh dev
```

**または手動で作成:**

```bash
# Terraform ステート保存用の S3 バケットを作成
aws s3api create-bucket \
  --bucket feed-bower-terraform-state-dev \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1

# バージョニングを有効化
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
```

### ステップ 2: 設定ファイルの作成

```bash
cd infra/environments/dev
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集：

```hcl
aws_region = "ap-northeast-1"
github_repository = "https://github.com/YOUR_USERNAME/feed-bower"
github_token = "ghp_YOUR_GITHUB_TOKEN_HERE"
```

**GitHub トークンの取得方法**:
1. https://github.com/settings/tokens にアクセス
2. "Generate new token (classic)" をクリック
3. スコープ: `repo`, `admin:repo_hook` を選択
4. トークンをコピー

### ステップ 3: Terraform 初期化

```bash
terraform init
```

### ステップ 4: 実行計画の確認

```bash
terraform plan
```

作成されるリソース数を確認：
- 約 30〜40 個のリソースが作成される予定

### ステップ 5: リソースのデプロイ

```bash
terraform apply
```

`yes` と入力して実行。約 5〜10 分かかります。

### ステップ 6: S3 バックエンドへの移行（推奨）

```bash
# main.tf の backend "s3" ブロックのコメントを外す
vim main.tf

# ステートファイルを S3 に移行
terraform init -migrate-state

# 確認プロンプトで "yes" と入力
```

これで、ステートファイルが S3 に保存され、`use_lockfile = true` により DynamoDB なしでロックが機能します。

### ステップ 7: デプロイ結果の確認

```bash
# API Gateway URL を取得
terraform output api_gateway_url

# Amplify URL を取得
terraform output amplify_branch_urls
```

## 次にやること

### Lambda イメージのビルドとデプロイ

```bash
# ECR リポジトリ URL を取得
ECR_URL=$(terraform output -raw ecr_repository_url)

# ECR にログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# プロジェクトルートに移動
cd ../../../

# Docker イメージをビルド
docker build -t feed-bower-api-production -f api/Dockerfile .

# イメージにタグを付けてプッシュ
docker tag feed-bower-api-production:latest $ECR_URL:latest
docker push $ECR_URL:latest

# Lambda 関数を更新（イメージが反映される）
cd infra/environments/dev
terraform apply -replace=module.lambda.aws_lambda_function.function
```

### API のテスト

```bash
# API エンドポイントを取得
API_URL=$(terraform output -raw api_gateway_url)

# ヘルスチェック
curl $API_URL/health

# 期待されるレスポンス
# {"status":"ok","environment":"dev"}
```

### フロントエンドのデプロイ

Amplify は GitHub リポジトリと連携しているため、`develop` ブランチにプッシュすると自動的にビルド・デプロイされます。

```bash
# develop ブランチにプッシュ
git checkout develop
git push origin develop

# Amplify コンソールでビルド状況を確認
# https://console.aws.amazon.com/amplify/
```

## トラブルシューティング

### エラー: "Error creating ECR repository"

**原因**: 同名のリポジトリが既に存在する

**解決方法**:
```bash
# 既存のリポジトリを削除
aws ecr delete-repository --repository-name feed-bower-api-production --force

# 再度デプロイ
terraform apply
```

### エラー: "Error creating Amplify app"

**原因**: GitHub トークンが無効

**解決方法**:
1. GitHub トークンを再生成
2. `terraform.tfvars` を更新
3. `terraform apply` を再実行

### Lambda 関数が 502 エラーを返す

**原因**: ECR イメージがプッシュされていない

**解決方法**: 上記の「Lambda イメージのビルドとデプロイ」を実行

## リソースの削除

開発環境を削除する場合：

```bash
terraform destroy
```

`yes` と入力して実行。約 5 分で削除完了。

## よくある質問

**Q: デプロイにどのくらい時間がかかりますか？**

A: 初回デプロイは約 5〜10 分です。

**Q: 料金はどのくらいかかりますか？**

A: 開発環境（PAY_PER_REQUEST モード）では、使用量に応じて課金されます。
- DynamoDB: 読み書きリクエストごと
- Lambda: 実行時間とメモリ使用量
- API Gateway: API リクエスト数
- Amplify: ビルド時間とホスティング

アイドル状態では月額 $5〜$10 程度です。

**Q: 本番環境にデプロイするには？**

A: `infra/environments/prod/` ディレクトリを作成し、同様の手順でデプロイします。
本番環境では以下の設定を推奨：
- DynamoDB: PROVISIONED モード + Auto Scaling
- Lambda: Provisioned Concurrency
- API Gateway: カスタムドメイン + WAF
- Amplify: カスタムドメイン

**Q: バックアップは自動で取られますか？**

A: 開発環境では Point-in-Time Recovery は無効です。
本番環境では有効化を推奨します。

## サポート

問題が発生した場合は、以下を確認してください：

1. **Terraform ログ**: エラーメッセージを確認
2. **AWS コンソール**: リソースの状態を確認
3. **CloudWatch Logs**: Lambda のログを確認

詳細な手順は `README.md` を参照してください。
