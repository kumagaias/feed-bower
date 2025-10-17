#!/bin/bash

# 開発用ユーザー作成スクリプト（自動化用）
# Feed Bower プロジェクト用 - 非対話的バージョン

set -e

# DynamoDB Local エンドポイント
ENDPOINT="http://localhost:8000"
REGION="ap-northeast-1"

# DynamoDB Local が起動しているかチェック
if ! aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION >/dev/null 2>&1; then
    echo "❌ エラー: DynamoDB Local に接続できません"
    exit 1
fi

# Usersテーブルが存在するかチェック
if ! aws dynamodb describe-table --table-name Users --endpoint-url $ENDPOINT --region $REGION >/dev/null 2>&1; then
    echo "❌ エラー: Users テーブルが存在しません"
    exit 1
fi

# 開発用ユーザーの情報
DEV_USER_ID="dev-user-001"
DEV_EMAIL="dev@feed-bower.local"
DEV_NAME="Development User"
CURRENT_TIME=$(date +%s)

# 既存の開発用ユーザーをチェック
echo "ユーザーID $DEV_USER_ID の存在確認中..."

EXISTING_USER=$(aws dynamodb get-item \
    --table-name Users \
    --key '{"user_id":{"S":"'$DEV_USER_ID'"}}' \
    --endpoint-url $ENDPOINT \
    --region $REGION \
    --query 'Item' \
    --output text 2>/dev/null)

echo "既存ユーザー検索結果: '$EXISTING_USER'"

if [ "$EXISTING_USER" != "None" ] && [ -n "$EXISTING_USER" ]; then
    echo "開発用ユーザーは既に存在します。スキップします。"
    echo "既存ユーザー詳細:"
    aws dynamodb get-item \
        --table-name Users \
        --key '{"user_id":{"S":"'$DEV_USER_ID'"}}' \
        --endpoint-url $ENDPOINT \
        --region $REGION \
        --output table \
        --query 'Item.{UserID:user_id.S,Email:email.S,Name:name.S}' 2>/dev/null
    exit 0
fi

echo "開発用ユーザーを作成中..."

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

aws dynamodb put-item \
    --table-name Users \
    --item file://"$TEMP_JSON" \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

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

aws dynamodb put-item \
    --table-name ChickStats \
    --item file://"$TEMP_CHICK_JSON" \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

# Clean up temporary file
rm "$TEMP_CHICK_JSON"

echo "✅ 開発用ユーザー作成完了 (dev@feed-bower.local / password)"