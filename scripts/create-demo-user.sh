#!/bin/bash

# デモユーザー作成スクリプト
# Usage: ./scripts/create-demo-user.sh [environment]

set -e

ENVIRONMENT=${1:-production}
EMAIL="feed-bower-demo@example.com"
PASSWORD="XjvHG5LMBoFZ"
USER_POOL_ID=""

# 環境に応じたUser Pool IDを取得
if [ "$ENVIRONMENT" = "production" ]; then
    USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --query "UserPools[?Name=='feed-bower-production'].Id" --output text)
elif [ "$ENVIRONMENT" = "development" ]; then
    USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --query "UserPools[?Name=='feed-bower-development'].Id" --output text)
else
    echo "Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [production|development]"
    exit 1
fi

if [ -z "$USER_POOL_ID" ]; then
    echo "❌ User Pool not found for environment: $ENVIRONMENT"
    exit 1
fi

echo "📋 Environment: $ENVIRONMENT"
echo "📋 User Pool ID: $USER_POOL_ID"
echo "📋 Email: $EMAIL"
echo ""

# ユーザーが既に存在するか確認
if aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$EMAIL" 2>/dev/null; then
    echo "⚠️  Demo user already exists"
    echo ""
    read -p "Do you want to delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Deleting existing demo user..."
        aws cognito-idp admin-delete-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "$EMAIL"
        echo "✅ Deleted"
    else
        echo "Skipping creation"
        exit 0
    fi
fi

echo "👤 Creating demo user..."

# ユーザーを作成
aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --user-attributes \
        Name=email,Value="$EMAIL" \
        Name=email_verified,Value=true \
        Name=name,Value="Demo User" \
    --message-action SUPPRESS

echo "✅ User created"

# パスワードを設定（永続的）
echo "🔑 Setting permanent password..."
aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --password "$PASSWORD" \
    --permanent

echo "✅ Password set"

# ユーザーを確認済みにする
echo "✓ Confirming user..."
aws cognito-idp admin-update-user-attributes \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --user-attributes Name=email_verified,Value=true

echo "✅ User confirmed"
echo ""
echo "🎉 Demo user created successfully!"
echo ""
echo "📋 Login credentials:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
