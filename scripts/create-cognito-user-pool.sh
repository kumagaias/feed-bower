#!/bin/bash

# Cognitoユーザープール作成スクリプト
# Feed Bower プロジェクト用

set -e

REGION="ap-northeast-1"
USER_POOL_NAME="feed-bower-user-pool"
CLIENT_NAME="feed-bower-client"

echo "🐣 Feed Bower - Cognitoユーザープール作成開始"
echo "リージョン: $REGION"
echo ""

# ユーザープールを作成
echo "Cognitoユーザープールを作成中..."
USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "$USER_POOL_NAME" \
    --region "$REGION" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": false,
            "RequireLowercase": false,
            "RequireNumbers": false,
            "RequireSymbols": false
        }
    }' \
    --auto-verified-attributes email \
    --username-attributes email \
    --verification-message-template '{
        "DefaultEmailOption": "CONFIRM_WITH_CODE",
        "EmailSubject": "Feed Bower - メールアドレスの確認",
        "EmailMessage": "Feed Bowerへようこそ！確認コード: {####}"
    }' \
    --admin-create-user-config '{
        "AllowAdminCreateUserOnly": false,
        "UnusedAccountValidityDays": 7
    }' \
    --user-pool-tags '{
        "Project": "feed-bower",
        "Environment": "development"
    }' \
    --query 'UserPool.Id' \
    --output text)

echo "✅ ユーザープールを作成しました: $USER_POOL_ID"

# ユーザープールクライアントを作成
echo "ユーザープールクライアントを作成中..."
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "$CLIENT_NAME" \
    --region "$REGION" \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
    --prevent-user-existence-errors ENABLED \
    --enable-token-revocation \
    --token-validity-units '{
        "AccessToken": "hours",
        "IdToken": "hours",
        "RefreshToken": "days"
    }' \
    --access-token-validity 1 \
    --id-token-validity 1 \
    --refresh-token-validity 30 \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "✅ ユーザープールクライアントを作成しました: $CLIENT_ID"
echo ""

# 開発用ユーザーを作成
echo "開発用ユーザーを作成中..."
DEV_EMAIL="dev@feed-bower.local"
DEV_PASSWORD="DevPassword123!"

aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$DEV_EMAIL" \
    --user-attributes Name=email,Value="$DEV_EMAIL" Name=email_verified,Value=true \
    --temporary-password "$DEV_PASSWORD" \
    --message-action SUPPRESS \
    --region "$REGION" >/dev/null

# パスワードを永続化
aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$DEV_EMAIL" \
    --password "$DEV_PASSWORD" \
    --permanent \
    --region "$REGION" >/dev/null

echo "✅ 開発用ユーザーを作成しました"
echo ""

# 環境変数ファイルを更新
echo "環境変数ファイルを更新中..."
ENV_FILE="../front/.env.local"

cat > "$ENV_FILE" << EOF
# AWS Cognito Configuration
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=$CLIENT_ID
NEXT_PUBLIC_AWS_REGION=$REGION

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api
EOF

echo "✅ 環境変数ファイルを更新しました: $ENV_FILE"
echo ""

echo "🎉 Cognitoセットアップが完了しました！"
echo ""
echo "📋 作成されたリソース:"
echo "   ユーザープールID: $USER_POOL_ID"
echo "   クライアントID: $CLIENT_ID"
echo "   リージョン: $REGION"
echo ""
echo "📝 開発用ログイン情報:"
echo "   メール: $DEV_EMAIL"
echo "   パスワード: $DEV_PASSWORD"
echo ""
echo "🔍 確認方法:"
echo "   AWS Console: https://console.aws.amazon.com/cognito/"
echo "   フロントエンド: http://localhost:3000"
echo ""
echo "✨ セットアップ完了！"