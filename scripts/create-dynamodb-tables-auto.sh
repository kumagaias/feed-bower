#!/bin/bash

# DynamoDB Local テーブル作成スクリプト（自動化用）
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

# 既存テーブルの確認
EXISTING_TABLES=$(aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION --query 'TableNames' --output text 2>/dev/null || echo "")

if [ ! -z "$EXISTING_TABLES" ]; then
    echo "既存のテーブルが見つかりました。スキップします。"
    exit 0
fi

echo "DynamoDB テーブルを作成中..."

# 1. Users テーブル作成（EmailIndex GSI付き）
aws dynamodb create-table \
    --table-name Users \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=EmailIndex,KeySchema='[{AttributeName=email,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

# 2. Bowers テーブル作成（UserIdIndex GSI付き）
aws dynamodb create-table \
    --table-name Bowers \
    --attribute-definitions \
        AttributeName=bower_id,AttributeType=S \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=bower_id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=UserIdIndex,KeySchema='[{AttributeName=user_id,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

# 3. Feeds テーブル作成（BowerIdIndex GSI付き）
aws dynamodb create-table \
    --table-name Feeds \
    --attribute-definitions \
        AttributeName=feed_id,AttributeType=S \
        AttributeName=bower_id,AttributeType=S \
    --key-schema \
        AttributeName=feed_id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=BowerIdIndex,KeySchema='[{AttributeName=bower_id,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

# 4. Articles テーブル作成（FeedIdPublishedAtIndex GSI付き）
aws dynamodb create-table \
    --table-name Articles \
    --attribute-definitions \
        AttributeName=article_id,AttributeType=S \
        AttributeName=feed_id,AttributeType=S \
        AttributeName=published_at,AttributeType=N \
    --key-schema \
        AttributeName=article_id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=FeedIdPublishedAtIndex,KeySchema='[{AttributeName=feed_id,KeyType=HASH},{AttributeName=published_at,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

# 5. LikedArticles テーブル作成（複合キー）
aws dynamodb create-table \
    --table-name LikedArticles \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
        AttributeName=article_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
        AttributeName=article_id,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

# 6. ChickStats テーブル作成（シンプルなハッシュキー）
aws dynamodb create-table \
    --table-name ChickStats \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null 2>&1

# テーブル作成の完了を待つ
sleep 3

echo "✅ DynamoDB テーブル作成完了"