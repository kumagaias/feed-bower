#!/bin/bash

# Magnito用開発ユーザー作成スクリプト
# Feed Bower プロジェクト用

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[MAGNITO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cognito Local エンドポイント
COGNITO_ENDPOINT="http://localhost:9229"
USER_POOL_ID="local_xSR9dPrp8"
CLIENT_ID="73ev8tq1pmg6bum65mnj6vu3nm"
REGION="ap-northeast-1"

# 開発用ユーザーの情報
DEV_EMAIL="dev@feed-bower.local"
DEV_PASSWORD="DevPassword123!"
DEV_NAME="Development User"

# Cognito Local が起動しているかチェック
print_status "Checking Cognito Local connection..."
if ! curl -s "$COGNITO_ENDPOINT" > /dev/null; then
    print_error "Cognito Local is not running at $COGNITO_ENDPOINT"
    print_status "Please start Cognito Local first with Docker"
    exit 1
fi

print_success "Cognito Local is running"

# AWS CLI でCognito Localにユーザーを作成
print_status "Creating development user in Cognito Local..."

# ユーザーを作成
aws cognito-idp admin-create-user \
    --endpoint-url "$COGNITO_ENDPOINT" \
    --user-pool-id "$USER_POOL_ID" \
    --username "$DEV_EMAIL" \
    --user-attributes Name=email,Value="$DEV_EMAIL" Name=name,Value="$DEV_NAME" Name=email_verified,Value=true \
    --temporary-password "$DEV_PASSWORD" \
    --message-action SUPPRESS \
    --region "$REGION" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "User created successfully"
else
    print_warning "User might already exist, trying to set permanent password..."
fi

# パスワードを永続化（一時パスワードから変更）
aws cognito-idp admin-set-user-password \
    --endpoint-url "$COGNITO_ENDPOINT" \
    --user-pool-id "$USER_POOL_ID" \
    --username "$DEV_EMAIL" \
    --password "$DEV_PASSWORD" \
    --permanent \
    --region "$REGION" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "Password set as permanent"
else
    print_warning "Failed to set permanent password, but continuing..."
fi

# Magnetoでは永続パスワード設定時に自動的に確認済み状態になるため、
# admin-confirm-sign-upは不要
print_status "User is automatically confirmed in Magnito after setting permanent password"

print_success "Development user setup completed!"
print_status "Email: $DEV_EMAIL"
print_status "Password: $DEV_PASSWORD"
print_status "You can now login with these credentials"

# set -eを再度有効にする
set -e

# ユーザー一覧を表示
print_status "Current users in Cognito Local:"
print_status "Debug: COGNITO_ENDPOINT=$COGNITO_ENDPOINT"
print_status "Debug: USER_POOL_ID=$USER_POOL_ID"
print_status "Debug: REGION=$REGION"

# list-usersコマンドを実行（エラーハンドリング付き）
aws cognito-idp list-users \
    --endpoint-url "$COGNITO_ENDPOINT" \
    --user-pool-id "$USER_POOL_ID" \
    --region "$REGION" \
    --output table \
    --query 'Users[].{Username:Username,Email:Attributes[?Name==`email`].Value|[0],Status:UserStatus}' 2>&1
LIST_EXIT_CODE=$?

if [ $LIST_EXIT_CODE -eq 0 ]; then
    print_success "User list retrieved successfully"
else
    print_warning "Could not list users (exit code: $LIST_EXIT_CODE)"
fi

# 正常終了
exit 0