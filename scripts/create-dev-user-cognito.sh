#!/bin/bash

# 開発用ユーザー作成スクリプト（Cognito互換）
# Feed Bower プロジェクト用 - Cognitoと互換性のあるユーザーID生成

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CREATE-USER]${NC} $1"
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

# DynamoDB Local エンドポイント
ENDPOINT="http://localhost:8000"
REGION="ap-northeast-1"

# DynamoDB Local が起動しているかチェック
if ! aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION >/dev/null 2>&1; then
    print_error "DynamoDB Local に接続できません"
    exit 1
fi

# Usersテーブルが存在するかチェック
if ! aws dynamodb describe-table --table-name Users --endpoint-url $ENDPOINT --region $REGION >/dev/null 2>&1; then
    print_error "Users テーブルが存在しません"
    exit 1
fi

# 開発用ユーザーの情報
DEV_EMAIL="dev@feed-bower.local"
DEV_NAME="Development User"
CURRENT_TIME=$(date +%s)

# CognitoスタイルのユーザーIDを生成（UUID v4形式）
# macOSでuuidgenが利用可能
if command -v uuidgen >/dev/null 2>&1; then
    DEV_USER_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
else
    # Fallback: Python を使用してUUIDを生成
    DEV_USER_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
fi

print_status "生成されたユーザーID: $DEV_USER_ID"

# 既存の開発用ユーザーをメールアドレスでチェック
print_status "メールアドレス $DEV_EMAIL での既存ユーザー確認中..."

EXISTING_USER=$(aws dynamodb scan \
    --endpoint-url $ENDPOINT \
    --table-name Users \
    --filter-expression "email = :email" \
    --expression-attribute-values '{":email":{"S":"'$DEV_EMAIL'"}}' \
    --region $REGION \
    --query 'Items[0].user_id.S' \
    --output text 2>/dev/null)

print_status "既存ユーザー検索結果: '$EXISTING_USER'"

if [ -n "$EXISTING_USER" ] && [ "$EXISTING_USER" != "None" ]; then
    print_warning "メールアドレス $DEV_EMAIL のユーザーは既に存在します"
    print_status "既存ユーザー詳細:"
    aws dynamodb scan \
        --endpoint-url $ENDPOINT \
        --table-name Users \
        --filter-expression "email = :email" \
        --expression-attribute-values '{":email":{"S":"'$DEV_EMAIL'"}}' \
        --region $REGION \
        --output table \
        --query 'Items[0].{UserID:user_id.S,Email:email.S,Name:name.S}' 2>/dev/null
    
    # 既存のユーザーIDを返す
    echo "EXISTING_USER_ID=$EXISTING_USER"
    exit 0
fi

print_status "新しい開発用ユーザーを作成中..."

# 開発用ユーザーを作成
# Create temporary JSON file to avoid shell escaping issues
TEMP_JSON=$(mktemp)
cat > "$TEMP_JSON" << EOF
{
    "user_id": {"S": "$DEV_USER_ID"},
    "email": {"S": "$DEV_EMAIL"},
    "password_hash": {"S": "\$2b\$12\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"},
    "name": {"S": "$DEV_NAME"},
    "language": {"S": "ja"},
    "created_at": {"N": "$CURRENT_TIME"},
    "updated_at": {"N": "$CURRENT_TIME"}
}
EOF

if aws dynamodb put-item \
    --table-name Users \
    --item file://"$TEMP_JSON" \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1; then
    print_success "ユーザー作成成功"
else
    print_error "ユーザー作成失敗"
    rm "$TEMP_JSON"
    exit 1
fi

# Clean up temporary file
rm "$TEMP_JSON"

# ChickStats テーブルにも初期データを作成
TEMP_CHICK_JSON=$(mktemp)
cat > "$TEMP_CHICK_JSON" << EOF
{
    "user_id": {"S": "$DEV_USER_ID"},
    "total_likes": {"N": "0"},
    "level": {"N": "1"},
    "experience": {"N": "0"},
    "next_level_exp": {"N": "10"},
    "checked_days": {"N": "0"},
    "created_at": {"N": "$CURRENT_TIME"},
    "updated_at": {"N": "$CURRENT_TIME"}
}
EOF

if aws dynamodb put-item \
    --table-name ChickStats \
    --item file://"$TEMP_CHICK_JSON" \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1; then
    print_success "ChickStats初期化成功"
else
    print_warning "ChickStats初期化失敗（続行します）"
fi

# Clean up temporary file
rm "$TEMP_CHICK_JSON"

print_success "開発用ユーザー作成完了"
print_status "ユーザーID: $DEV_USER_ID"
print_status "メール: $DEV_EMAIL"
print_status "パスワード: password"

# 作成されたユーザーIDを環境変数として出力
echo "CREATED_USER_ID=$DEV_USER_ID"