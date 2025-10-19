#!/bin/bash

# DynamoDB Local テーブル検証スクリプト
# Feed Bower プロジェクト用

set -e

ENDPOINT="http://localhost:8000"
REGION="ap-northeast-1"

# 環境名（デフォルトは development）
ENVIRONMENT="${ENVIRONMENT:-development}"
TABLE_SUFFIX="-${ENVIRONMENT}"

echo "🔍 DynamoDB Local テーブル検証開始"
echo "環境: $ENVIRONMENT"
echo ""

# 全テーブルの一覧表示
echo "📊 作成されたテーブル一覧:"
aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION --query 'TableNames' --output table

echo ""
echo "🔍 各テーブルの詳細検証:"

# Users テーブル検証
echo ""
echo "1️⃣ Users${TABLE_SUFFIX} テーブル:"
echo "   - Primary Key: user_id (HASH)"
echo "   - GSI: EmailIndex (email)"
aws dynamodb describe-table --table-name "Users${TABLE_SUFFIX}" --endpoint-url $ENDPOINT --region $REGION \
    --query 'Table.{KeySchema:KeySchema,GSI:GlobalSecondaryIndexes[0].{IndexName:IndexName,KeySchema:KeySchema}}' \
    --output table

# Bowers テーブル検証
echo ""
echo "2️⃣ Bowers${TABLE_SUFFIX} テーブル:"
echo "   - Primary Key: bower_id (HASH)"
echo "   - GSI: UserIdIndex (user_id)"
aws dynamodb describe-table --table-name "Bowers${TABLE_SUFFIX}" --endpoint-url $ENDPOINT --region $REGION \
    --query 'Table.{KeySchema:KeySchema,GSI:GlobalSecondaryIndexes[0].{IndexName:IndexName,KeySchema:KeySchema}}' \
    --output table

# Feeds テーブル検証
echo ""
echo "3️⃣ Feeds${TABLE_SUFFIX} テーブル:"
echo "   - Primary Key: feed_id (HASH)"
echo "   - GSI: BowerIdIndex (bower_id)"
aws dynamodb describe-table --table-name "Feeds${TABLE_SUFFIX}" --endpoint-url $ENDPOINT --region $REGION \
    --query 'Table.{KeySchema:KeySchema,GSI:GlobalSecondaryIndexes[0].{IndexName:IndexName,KeySchema:KeySchema}}' \
    --output table

# Articles テーブル検証
echo ""
echo "4️⃣ Articles${TABLE_SUFFIX} テーブル:"
echo "   - Primary Key: article_id (HASH)"
echo "   - GSI: FeedIdPublishedAtIndex (feed_id + published_at)"
aws dynamodb describe-table --table-name "Articles${TABLE_SUFFIX}" --endpoint-url $ENDPOINT --region $REGION \
    --query 'Table.{KeySchema:KeySchema,GSI:GlobalSecondaryIndexes[0].{IndexName:IndexName,KeySchema:KeySchema}}' \
    --output table

# LikedArticles テーブル検証
echo ""
echo "5️⃣ LikedArticles${TABLE_SUFFIX} テーブル:"
echo "   - Primary Key: user_id (HASH) + article_id (RANGE)"
echo "   - GSI: なし"
aws dynamodb describe-table --table-name "LikedArticles${TABLE_SUFFIX}" --endpoint-url $ENDPOINT --region $REGION \
    --query 'Table.KeySchema' \
    --output table

# ChickStats テーブル検証
echo ""
echo "6️⃣ ChickStats${TABLE_SUFFIX} テーブル:"
echo "   - Primary Key: user_id (HASH)"
echo "   - GSI: なし"
aws dynamodb describe-table --table-name "ChickStats${TABLE_SUFFIX}" --endpoint-url $ENDPOINT --region $REGION \
    --query 'Table.KeySchema' \
    --output table

echo ""
echo "✅ 全てのテーブルが正常に作成されています！（環境: $ENVIRONMENT）"
echo ""
echo "🌐 DynamoDB Admin でテーブル構造を確認:"
echo "   http://localhost:8001"
echo ""
echo "📝 個別テーブル詳細確認コマンド例:"
echo "   aws dynamodb describe-table --table-name Users${TABLE_SUFFIX} --endpoint-url $ENDPOINT --region $REGION"