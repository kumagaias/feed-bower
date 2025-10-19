# GitHub Actions デプロイ設定

## 概要

GitHub Actions を使用して、ブランチへのマージ時に自動デプロイを行います。

### デプロイフロー

- **develop ブランチ** → Development 環境
- **main ブランチ** → Production 環境

### 自動デプロイの対象

- **バックエンド（Lambda）**: GitHub Actions で ECR にプッシュして Lambda を更新
- **フロントエンド（Amplify）**: Amplify が自動的にビルド・デプロイ（GitHub Actions 不要）

## セットアップ手順

### 1. AWS OIDC プロバイダーの作成

GitHub Actions から AWS にアクセスするために、OIDC プロバイダーを作成します。

```bash
# OIDC プロバイダーを作成
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2. IAM ロールの作成

#### Development 環境用ロール

```bash
# 信頼ポリシーを作成
cat > trust-policy-dev.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/develop"
        }
      }
    }
  ]
}
EOF

# アカウント ID とリポジトリ情報を置き換え
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
GITHUB_REPO="YOUR_GITHUB_ORG/YOUR_REPO"  # 例: "akihisa-kumagai/feed-bower"

sed -i '' "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" trust-policy-dev.json
sed -i '' "s|YOUR_GITHUB_ORG/YOUR_REPO|$GITHUB_REPO|g" trust-policy-dev.json

# ロールを作成
aws iam create-role \
  --role-name GitHubActions-FeedBower-Development \
  --assume-role-policy-document file://trust-policy-dev.json

# 権限ポリシーを作成
cat > permissions-policy-dev.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:ap-northeast-1:*:function:feed-bower-api-development"
    }
  ]
}
EOF

# ポリシーをアタッチ
aws iam put-role-policy \
  --role-name GitHubActions-FeedBower-Development \
  --policy-name DeploymentPolicy \
  --policy-document file://permissions-policy-dev.json

# ロール ARN を取得
aws iam get-role \
  --role-name GitHubActions-FeedBower-Development \
  --query 'Role.Arn' \
  --output text
```

#### Production 環境用ロール

```bash
# 信頼ポリシーを作成
cat > trust-policy-prod.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# アカウント ID とリポジトリ情報を置き換え
sed -i '' "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" trust-policy-prod.json
sed -i '' "s|YOUR_GITHUB_ORG/YOUR_REPO|$GITHUB_REPO|g" trust-policy-prod.json

# ロールを作成
aws iam create-role \
  --role-name GitHubActions-FeedBower-Production \
  --assume-role-policy-document file://trust-policy-prod.json

# 権限ポリシーを作成
cat > permissions-policy-prod.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:ap-northeast-1:*:function:feed-bower-api-production"
    }
  ]
}
EOF

# ポリシーをアタッチ
aws iam put-role-policy \
  --role-name GitHubActions-FeedBower-Production \
  --policy-name DeploymentPolicy \
  --policy-document file://permissions-policy-prod.json

# ロール ARN を取得
aws iam get-role \
  --role-name GitHubActions-FeedBower-Production \
  --query 'Role.Arn' \
  --output text
```

### 3. GitHub Secrets の設定

GitHub リポジトリの Settings → Secrets and variables → Actions で以下のシークレットを追加：

1. **AWS_ROLE_ARN_DEVELOPMENT**
   - 値: `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActions-FeedBower-Development`

2. **AWS_ROLE_ARN_PRODUCTION**
   - 値: `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActions-FeedBower-Production`

### 4. 動作確認

#### Development 環境

```bash
# develop ブランチにマージ
git checkout develop
git merge feature/your-feature
git push origin develop
```

GitHub Actions が自動的に：
1. バックエンドをビルド
2. ECR にプッシュ
3. Lambda 関数を更新

Amplify が自動的に：
1. フロントエンドをビルド
2. デプロイ

#### Production 環境

```bash
# main ブランチにマージ
git checkout main
git merge develop
git push origin main
```

同様に自動デプロイが実行されます。

## トラブルシューティング

### OIDC プロバイダーが既に存在する場合

```bash
# 既存のプロバイダーを確認
aws iam list-open-id-connect-providers
```

既に存在する場合は、作成手順をスキップしてください。

### ロールの権限エラー

GitHub Actions のログでエラーが発生した場合、IAM ロールの権限を確認してください：

```bash
# ロールのポリシーを確認
aws iam get-role-policy \
  --role-name GitHubActions-FeedBower-Development \
  --policy-name DeploymentPolicy
```

### Lambda 更新の失敗

Lambda 関数が存在しない場合、先に Terraform でデプロイしてください：

```bash
cd infra/environments/development
terraform apply
```

## 手動デプロイ

GitHub Actions の画面から手動でデプロイを実行することもできます：

1. GitHub リポジトリの Actions タブを開く
2. "Deploy to Development" または "Deploy to Production" を選択
3. "Run workflow" をクリック
4. ブランチを選択して実行

## セキュリティのベストプラクティス

1. **最小権限の原則**: IAM ロールには必要最小限の権限のみを付与
2. **ブランチ保護**: main ブランチには直接プッシュできないように設定
3. **レビュープロセス**: Production へのマージには必ずレビューを必須化
4. **シークレットの管理**: AWS 認証情報は GitHub Secrets で管理

## 参考リンク

- [GitHub Actions - AWS への認証](https://docs.github.com/ja/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS Amplify - GitHub 連携](https://docs.aws.amazon.com/amplify/latest/userguide/getting-started.html)
