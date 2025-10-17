#!/bin/bash

# 開発用ユーザー作成スクリプト
# Feed Bower プロジェクト用

set -e

# DynamoDB Local エンドポイント
ENDPOINT="http://localhost:8000"
REGION="ap-northeast-1"

echo "🐣 Feed Bower - 開発用ユーザー作成開始"
echo "エンドポイント: $ENDPOINT"
echo ""

# DynamoDB Local が起動しているかチェック
echo "DynamoDB Local の接続確認中..."
if ! aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION >/dev/null 2>&1; then
    echo "❌ エラー: DynamoDB Local に接続できません"
    echo "   docker-compose up -d dynamodb-local を実行してください"
    exit 1
fi
echo "✅ DynamoDB Local に接続しました"
echo ""

# Usersテーブルが存在するかチェック
echo "Users テーブルの確認中..."
if ! aws dynamodb describe-table --table-name Users --endpoint-url $ENDPOINT --region $REGION >/dev/null 2>&1; then
    echo "❌ エラー: Users テーブルが存在しません"
    echo "   scripts/create-dynamodb-tables.sh を先に実行してください"
    exit 1
fi
echo "✅ Users テーブルが存在します"
echo ""

# 開発用ユーザーの情報
DEV_USER_ID="dev-user-001"
DEV_EMAIL="dev@feed-bower.local"
DEV_NAME="Development User"
CURRENT_TIME=$(date +%s)

echo "開発用ユーザーの作成中..."
echo "  ユーザーID: $DEV_USER_ID"
echo "  メール: $DEV_EMAIL"
echo "  名前: $DEV_NAME"
echo "  パスワード: password"
echo ""

# 既存の開発用ユーザーをチェック
if aws dynamodb get-item \
    --table-name Users \
    --key '{"user_id":{"S":"'$DEV_USER_ID'"}}' \
    --endpoint-url $ENDPOINT \
    --region $REGION \
    --query 'Item' \
    --output text >/dev/null 2>&1; then
    echo "⚠️  開発用ユーザーは既に存在します"
    read -p "既存のユーザーを更新しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "ユーザー作成をスキップします"
        exit 0
    fi
fi

# 開発用ユーザーを作成/更新
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
    --region $REGION >/dev/null

# Clean up temporary file
rm "$TEMP_JSON"

echo "✅ 開発用ユーザーを作成しました"
echo ""

# ChickStats テーブルにも初期データを作成
echo "開発用ユーザーのChickStatsを作成中..."
# Create temporary JSON file for ChickStats
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
    --region $REGION >/dev/null

# Clean up temporary file
rm "$TEMP_CHICK_JSON"

echo "✅ ChickStats を作成しました"
echo ""

# 作成されたユーザーを確認
echo "📋 作成されたユーザー情報:"
aws dynamodb get-item \
    --table-name Users \
    --key '{"user_id":{"S":"'$DEV_USER_ID'"}}' \
    --endpoint-url $ENDPOINT \
    --region $REGION \
    --query 'Item.{UserID:user_id.S,Email:email.S,Name:name.S,Language:language.S}' \
    --output table

echo ""
echo "🎉 開発用ユーザーの作成が完了しました！"
echo ""
echo "📝 ログイン情報:"
echo "   メール: $DEV_EMAIL"
echo "   パスワード: password"
echo ""
echo "🔍 確認方法:"
echo "   DynamoDB Admin: http://localhost:8001"
echo "   フロントエンド: http://localhost:3000"
echo ""
echo "✨ セットアップ完了！"