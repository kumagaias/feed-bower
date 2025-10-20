# Cognito セットアップガイド

## メール確認方式

Feed Bowerでは、ユーザー登録時のメール確認に**URLリンク方式**を採用しています。

### 確認方式の違い

| 方式 | 説明 | ユーザー体験 |
|------|------|------------|
| `CONFIRM_WITH_CODE` | 確認コードをメールで送信 | ユーザーがコードをコピーして入力 |
| `CONFIRM_WITH_LINK` | 確認リンクをメールで送信 | ユーザーがリンクをクリックするだけ ✅ |

### 確認後の画面遷移

1. **ユーザーがサインアップ**
   - メールアドレスとパスワードを入力
   - サインアップボタンをクリック

2. **確認メールを受信**
   - 件名: "Feed Bower - メールアドレスの確認"
   - 本文に確認リンクが含まれる

3. **リンクをクリック**
   - Cognitoの確認完了ページに遷移
   - "Your email has been verified successfully" と表示される

4. **ログインページに戻る**
   - ユーザーは手動でログインページに戻る
   - または、カスタム確認ページ (`/verify-email`) を使用

### Hosted UIでの確認

Feed Bowerでは、**Cognito Hosted UI**を使用してカスタマイズされた確認ページを提供します：

**特徴**:
- 🎨 Feed Bowerのデザインに合わせたカスタムCSS
- 🪺 ブランドロゴとカラー（#14b8a6 ティール）
- 📱 レスポンシブデザイン
- ✅ 確認完了後、自動的にログインページへ

**Hosted UI URL**:
```
https://feed-bower-production.auth.ap-northeast-1.amazoncognito.com
```

**カスタマイズ内容**:
- 背景: グラデーション（ティール → ホワイト → アンバー）
- ボタン: ティールカラー (#14b8a6)
- ホバー: ダークグレー (#505050)
- フォント: 現在のログインモーダルと同じスタイル

### 現在の設定

**Terraform設定** (`infra/modules/cognito/main.tf`):
```hcl
verification_message_template {
  default_email_option  = "CONFIRM_WITH_LINK"
  email_subject         = "Feed Bower - Verify your email"
  email_message_by_link = "Welcome to Feed Bower! Please click the link below to verify your email address: {##Verify Email##}"
}
```

## デプロイ方法

### 本番環境へのデプロイ

```bash
# 1. Terraformディレクトリに移動
cd infra/environments/production

# 2. 初期化（初回のみ）
terraform init

# 3. 変更内容を確認
terraform plan

# 4. デプロイ
terraform apply

# 5. Cognito情報を確認
terraform output cognito_user_pool_id
terraform output -raw hosted_ui_url
```

**デプロイ後の確認**:
```bash
# Hosted UIにアクセス
open "https://feed-bower-production.auth.ap-northeast-1.amazoncognito.com/login?client_id=$(terraform output -raw cognito_client_id)&response_type=code&redirect_uri=https://www.feed-bower.net"
```

### 既存のUser Poolを更新する場合

既にUser Poolが存在する場合、Terraformで更新できます：

```bash
cd infra/environments/production

# 既存リソースをインポート（初回のみ）
terraform import module.cognito.aws_cognito_user_pool.pool ap-northeast-1_xxxxxxxxx

# 更新を適用
terraform apply
```

または、AWS CLIで直接更新：

```bash
aws cognito-idp update-user-pool \
  --user-pool-id ap-northeast-1_krlr3Seby \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_LINK",
    "EmailSubject": "Feed Bower - メールアドレスの確認",
    "EmailMessageByLink": "Feed Bowerへようこそ！以下のリンクをクリックしてメールアドレスを確認してください: {##Verify Email##}"
  }' \
  --region ap-northeast-1
```

## メールテンプレートのカスタマイズ

### 日本語メール

```hcl
verification_message_template {
  default_email_option  = "CONFIRM_WITH_LINK"
  email_subject         = "Feed Bower - メールアドレスの確認"
  email_message_by_link = "Feed Bowerへようこそ！\n\n以下のリンクをクリックしてメールアドレスを確認してください:\n{##Verify Email##}\n\nこのリンクは24時間有効です。"
}
```

### 英語メール

```hcl
verification_message_template {
  default_email_option  = "CONFIRM_WITH_LINK"
  email_subject         = "Feed Bower - Verify your email"
  email_message_by_link = "Welcome to Feed Bower!\n\nPlease click the link below to verify your email address:\n{##Verify Email##}\n\nThis link is valid for 24 hours."
}
```

### HTMLメール（カスタムSES使用時）

Cognitoのデフォルトメールではプレーンテキストのみですが、Amazon SESを使用するとHTMLメールが送信できます：

```hcl
email_configuration {
  email_sending_account = "DEVELOPER"
  source_arn           = aws_ses_email_identity.feed_bower.arn
  from_email_address   = "noreply@feed-bower.com"
}
```

## トラブルシューティング

### メールが届かない

1. **スパムフォルダを確認**
   - Cognitoからのメールがスパムに分類されることがあります

2. **メール送信制限**
   - Cognitoのデフォルトメールは1日50通まで
   - 本番環境ではSESの使用を推奨

3. **メールアドレスの確認**
   - `auto_verified_attributes = ["email"]`が設定されているか確認

### リンクが無効

1. **リンクの有効期限**
   - 確認リンクは24時間有効
   - 期限切れの場合は再送信が必要

2. **User Pool設定の確認**
   ```bash
   aws cognito-idp describe-user-pool \
     --user-pool-id ap-northeast-1_krlr3Seby \
     --region ap-northeast-1 \
     --query 'UserPool.VerificationMessageTemplate'
   ```

### 確認コード方式に戻したい場合

```bash
# Terraform
# infra/modules/cognito/main.tf を編集
verification_message_template {
  default_email_option = "CONFIRM_WITH_CODE"
  email_subject        = "Feed Bower - Verify your email"
  email_message        = "Your verification code is: {####}"
}

# terraform apply で適用
```

## ローカル開発環境（Magneto）

ローカル開発環境では、Magnetoが自動的にメール確認をスキップします。

設定ファイル: `front/src/lib/cognito-client.ts`
```typescript
// ローカル開発時は自動確認
if (isLocalDevelopment) {
  await this.confirmSignUp(username, "123456");
}
```

## カスタムリダイレクトの設定（オプション）

確認リンクをクリックした後、カスタムページにリダイレクトするには、以下の方法があります：

### 方法1: Hosted UIを使用

```hcl
# infra/modules/cognito/main.tf
resource "aws_cognito_user_pool_domain" "domain" {
  domain       = "feed-bower-${var.environment}"
  user_pool_id = aws_cognito_user_pool.pool.id
}

# Hosted UIのカスタマイズ
resource "aws_cognito_user_pool_ui_customization" "ui" {
  user_pool_id = aws_cognito_user_pool.pool.id
  
  css = <<CSS
    .banner-customizable {
      background-color: #14b8a6;
    }
  CSS
}
```

### 方法2: カスタムドメインを使用

独自ドメインでホストする場合：

```hcl
resource "aws_cognito_user_pool_domain" "custom" {
  domain          = "auth.feed-bower.com"
  certificate_arn = aws_acm_certificate.cert.arn
  user_pool_id    = aws_cognito_user_pool.pool.id
}
```

### 方法3: Lambda Triggerでリダイレクト

Post Confirmation Triggerを使用して、確認後の処理をカスタマイズ：

```javascript
exports.handler = async (event) => {
  // 確認完了後の処理
  console.log('User confirmed:', event.userName);
  
  // カスタムリダイレクトURLを設定
  event.response.redirectUrl = 'https://feed-bower.com/verify-email?success=true';
  
  return event;
};
```

## 現在の動作

現在の設定では：

1. ユーザーがサインアップ
2. 確認メールを受信
3. リンクをクリック → **Cognitoのデフォルトページに遷移**
4. ユーザーが手動でログインページに戻る

将来的には、カスタムドメインやHosted UIを使用して、よりシームレスな体験を提供できます。

## 参考リンク

- [AWS Cognito - Email Verification](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-email-phone-verification.html)
- [AWS Cognito - Hosted UI](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html)
- [Terraform - aws_cognito_user_pool](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool)
- [Magneto - Cognito Emulator](https://github.com/frouriojs/magnito)
