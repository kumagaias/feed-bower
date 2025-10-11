#!/bin/bash

# DynamoDB Local テーブル作成スクリプト
# Feed Bower プロジェクト用

set -e

# DynamoDB Local エンドポイント
ENDPOINT="http://localhost:8000"
REGION="us-east-1"

echo "🐣 Feed Bower - DynamoDB Local テーブル作成開始"
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

# 既存テーブルの確認と削除
echo "既存テーブルの確認中..."
EXISTING_TABLES=$(aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION --query 'TableNames' --output text 2>/dev/null || echo "")

if [ ! -z "$EXISTING_TABLES" ]; then
    echo "既存のテーブルが見つかりました: $EXISTING_TABLES"
    read -p "既存のテーブルを削除して再作成しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for table in $EXISTING_TABLES; do
            echo "テーブル削除中: $table"
            aws dynamodb delete-table --table-name $table --endpoint-url $ENDPOINT --region $REGION >/dev/null
            echo "✅ $table を削除しました"
        done
        echo ""
        # テーブル削除の完了を待つ
        sleep 2
    else
        echo "テーブル作成をスキップします"
        exit 0
    fi
fi

# ヘルパー関数: テーブル作成
create_table() {
    local table_name=$1
    local hash_key=$2
    local range_key=$3
    local gsi_config=$4
    
    echo "📝 $table_name テーブル作成中..."
    
    local cmd="aws dynamodb create-table --table-name $table_name"
    
    if [ ! -z "$range_key" ]; then
        cmd="$cmd --attribute-definitions AttributeName=$hash_key,AttributeType=S AttributeName=$range_key,AttributeType=S"
        cmd="$cmd --key-schema AttributeName=$hash_key,KeyType=HASH AttributeName=$range_key,KeyType=RANGE"
    else
        cmd="$cmd --attribute-definitions AttributeName=$hash_key,AttributeType=S"
        cmd="$cmd --key-schema AttributeName=$hash_key,KeyType=HASH"
    fi
    
    if [ ! -z "$gsi_config" ]; then
        cmd="$cmd $gsi_config"
    fi
    
    cmd="$cmd --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5"
    cmd="$cmd --endpoint-url $ENDPOINT --region $REGION"
    
    eval "$cmd" >/dev/null
    echo "✅ $table_name テーブルを作成しました"
}

# 1. Users テーブル作成（EmailIndex GSI付き）
echo "📝 Users テーブル作成中..."
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
    --region $REGION >/dev/null
echo "✅ Users テーブルを作成しました"

# 2. Bowers テーブル作成（UserIdIndex GSI付き）
echo "📝 Bowers テーブル作成中..."
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
    --region $REGION >/dev/null
echo "✅ Bowers テーブルを作成しました"

# 3. Feeds テーブル作成（BowerIdIndex GSI付き）
echo "📝 Feeds テーブル作成中..."
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
    --region $REGION >/dev/null
echo "✅ Feeds テーブルを作成しました"

# 4. Articles テーブル作成（FeedIdPublishedAtIndex GSI付き）
echo "📝 Articles テーブル作成中..."
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
    --region $REGION >/dev/null
echo "✅ Articles テーブルを作成しました"

# 5. LikedArticles テーブル作成（複合キー）
echo "📝 LikedArticles テーブル作成中..."
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
    --region $REGION >/dev/null
echo "✅ LikedArticles テーブルを作成しました"

# 6. ChickStats テーブル作成（シンプルなハッシュキー）
echo "📝 ChickStats テーブル作成中..."
aws dynamodb create-table \
    --table-name ChickStats \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT \
    --region $REGION >/dev/null
echo "✅ ChickStats テーブルを作成しました"

echo ""
echo "⏳ テーブル作成の完了を待機中..."
sleep 3

echo ""
echo "🎉 全てのテーブル作成が完了しました！"
echo ""
echo "📊 作成されたテーブル一覧:"
aws dynamodb list-tables --endpoint-url $ENDPOINT --region us-east-1 --query 'TableNames' --output table

echo ""
echo "🔍 テーブル詳細確認:"
echo "   DynamoDB Admin: http://localhost:8001"
echo "   AWS CLI: aws dynamodb describe-table --table-name [TABLE_NAME] --endpoint-url $ENDPOINT --region us-east-1"
echo ""
echo "✨ セットアップ完了！"