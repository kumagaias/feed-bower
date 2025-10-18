#!/bin/bash

# CognitoとDynamoDBのユーザー同期スクリプト
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
    echo -e "${BLUE}[SYNC-USER]${NC} $1"
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

# Configuration
COGNITO_ENDPOINT="http://localhost:9229"
USER_POOL_ID="ap-northeast-1_xSR9dPrp8"
COGNITO_REGION="ap-northeast-1"
DYNAMODB_ENDPOINT="http://localhost:8000"
DYNAMODB_REGION="ap-northeast-1"
DEV_EMAIL="dev@feed-bower.local"

print_status "CognitoとDynamoDBのユーザー同期を開始..."

# Get Cognito user ID
print_status "Cognitoからユーザー情報を取得中..."
COGNITO_USER_DATA=$(aws cognito-idp list-users \
    --endpoint-url "$COGNITO_ENDPOINT" \
    --user-pool-id "$USER_POOL_ID" \
    --region "$COGNITO_REGION" \
    --output json \
    --query "Users[?Attributes[?Name=='email' && Value=='$DEV_EMAIL']]" 2>/dev/null)

if [ -z "$COGNITO_USER_DATA" ] || [ "$COGNITO_USER_DATA" = "[]" ]; then
    print_warning "Cognitoにユーザー $DEV_EMAIL が見つかりません（まだ作成されていない可能性があります）"
    print_status "サインアップ後に自動的に同期されます"
    exit 0
fi

# Extract Cognito user ID (sub attribute)
COGNITO_USER_ID=$(echo "$COGNITO_USER_DATA" | jq -r '.[0].Attributes[] | select(.Name=="sub") | .Value')
COGNITO_USERNAME=$(echo "$COGNITO_USER_DATA" | jq -r '.[0].Username')

if [ -z "$COGNITO_USER_ID" ] || [ "$COGNITO_USER_ID" = "null" ]; then
    print_error "CognitoユーザーIDの取得に失敗しました"
    exit 1
fi

print_success "Cognitoユーザー情報取得成功"
print_status "Cognito User ID: $COGNITO_USER_ID"
print_status "Cognito Username: $COGNITO_USERNAME"

# Check if user exists in DynamoDB with this Cognito ID
print_status "DynamoDBでユーザー確認中..."
EXISTING_DYNAMODB_USER=$(aws dynamodb get-item \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --table-name Users \
    --key "{\"user_id\":{\"S\":\"$COGNITO_USER_ID\"}}" \
    --region "$DYNAMODB_REGION" \
    --output json \
    --query 'Item.user_id.S' 2>/dev/null || echo "null")

if [ "$EXISTING_DYNAMODB_USER" != "null" ] && [ -n "$EXISTING_DYNAMODB_USER" ]; then
    print_success "DynamoDBに正しいユーザーが既に存在します"
    print_status "User ID: $COGNITO_USER_ID"
    echo "SYNCED_USER_ID=$COGNITO_USER_ID"
    exit 0
fi

# Check for old user with same email but different ID
print_status "古いユーザーエントリを確認中..."
OLD_USER_DATA=$(aws dynamodb scan \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --table-name Users \
    --filter-expression "email = :email" \
    --expression-attribute-values "{\":email\":{\"S\":\"$DEV_EMAIL\"}}" \
    --region "$DYNAMODB_REGION" \
    --output json \
    --query 'Items[0]' 2>/dev/null)

if [ "$OLD_USER_DATA" != "null" ] && [ -n "$OLD_USER_DATA" ]; then
    OLD_USER_ID=$(echo "$OLD_USER_DATA" | jq -r '.user_id.S')
    print_warning "古いユーザーエントリが見つかりました: $OLD_USER_ID"
    
    # Delete old user
    print_status "古いユーザーエントリを削除中..."
    aws dynamodb delete-item \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --table-name Users \
        --key "{\"user_id\":{\"S\":\"$OLD_USER_ID\"}}" \
        --region "$DYNAMODB_REGION" >/dev/null 2>&1
    
    print_success "古いユーザーエントリを削除しました"
fi

# Create new user with Cognito ID
print_status "新しいユーザーエントリを作成中..."
CURRENT_TIME=$(date +%s)000  # milliseconds

# Create temporary JSON file
TEMP_JSON=$(mktemp)
cat > "$TEMP_JSON" << EOF
{
    "user_id": {"S": "$COGNITO_USER_ID"},
    "email": {"S": "$DEV_EMAIL"},
    "name": {"S": "Development User"},
    "language": {"S": "ja"},
    "is_guest": {"BOOL": false},
    "created_at": {"N": "$CURRENT_TIME"},
    "updated_at": {"N": "$CURRENT_TIME"}
}
EOF

if aws dynamodb put-item \
    --table-name Users \
    --item file://"$TEMP_JSON" \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --region "$DYNAMODB_REGION" >/dev/null 2>&1; then
    print_success "DynamoDBユーザー作成成功"
else
    print_error "DynamoDBユーザー作成失敗"
    rm "$TEMP_JSON"
    exit 1
fi

# Clean up temporary file
rm "$TEMP_JSON"

# Create ChickStats entry
print_status "ChickStats初期化中..."
TEMP_CHICK_JSON=$(mktemp)
cat > "$TEMP_CHICK_JSON" << EOF
{
    "user_id": {"S": "$COGNITO_USER_ID"},
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
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --region "$DYNAMODB_REGION" >/dev/null 2>&1; then
    print_success "ChickStats初期化成功"
else
    print_warning "ChickStats初期化失敗（続行します）"
fi

# Clean up temporary file
rm "$TEMP_CHICK_JSON"

print_success "CognitoとDynamoDBのユーザー同期完了"
print_status "Synced User ID: $COGNITO_USER_ID"
print_status "Email: $DEV_EMAIL"

# Output the synced user ID
echo "SYNCED_USER_ID=$COGNITO_USER_ID"