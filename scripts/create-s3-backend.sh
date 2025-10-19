#!/bin/bash

# Terraform ステート保存用の S3 バケットを作成するスクリプト
# 使用方法:
#   bash scripts/create-s3-backend.sh dev
#   bash scripts/create-s3-backend.sh prod

set -e

# ヘルプメッセージ
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  echo "使用方法: bash scripts/create-s3-backend.sh [ENVIRONMENT]"
  echo ""
  echo "引数:"
  echo "  ENVIRONMENT    環境名 (development, prod など。デフォルト: development)"
  echo ""
  echo "環境変数:"
  echo "  AWS_REGION     AWS リージョン (デフォルト: ap-northeast-1)"
  echo ""
  echo "例:"
  echo "  bash scripts/create-s3-backend.sh development"
  echo "  bash scripts/create-s3-backend.sh prod"
  echo "  AWS_REGION=us-east-1 bash scripts/create-s3-backend.sh development"
  exit 0
fi

# 環境を引数から取得（デフォルトは development）
ENVIRONMENT=${1:-development}
REGION=${AWS_REGION:-ap-northeast-1}
BUCKET_NAME="feed-bower-terraform-state-${ENVIRONMENT}"

# 環境名のバリデーション
if [[ ! "$ENVIRONMENT" =~ ^[a-z0-9-]+$ ]]; then
  echo "❌ エラー: 環境名は小文字の英数字とハイフンのみ使用できます"
  echo "   指定された環境名: ${ENVIRONMENT}"
  exit 1
fi

echo "🌍 環境: ${ENVIRONMENT}"
echo "🪣 S3 バケットを作成中: ${BUCKET_NAME}"
echo "📍 リージョン: ${REGION}"
echo ""

# S3 バケットを作成
echo "1️⃣  S3 バケットを作成中..."
if aws s3api create-bucket \
  --bucket ${BUCKET_NAME} \
  --region ${REGION} \
  --create-bucket-configuration LocationConstraint=${REGION} 2>/dev/null; then
  echo "✅ S3 バケットを作成しました"
else
  echo "⚠️  バケットは既に存在します（スキップ）"
fi

# バージョニングを有効化
echo ""
echo "2️⃣  バージョニングを有効化中..."
aws s3api put-bucket-versioning \
  --bucket ${BUCKET_NAME} \
  --versioning-configuration Status=Enabled

echo "✅ バージョニングを有効化しました"

# 暗号化を有効化
echo ""
echo "3️⃣  暗号化を有効化中..."
aws s3api put-bucket-encryption \
  --bucket ${BUCKET_NAME} \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

echo "✅ 暗号化を有効化しました"

# パブリックアクセスをブロック
echo ""
echo "4️⃣  パブリックアクセスをブロック中..."
aws s3api put-public-access-block \
  --bucket ${BUCKET_NAME} \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✅ パブリックアクセスをブロックしました"

# バケットが作成されたことを確認
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 S3 バケットのセットアップが完了しました！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 バケット名: ${BUCKET_NAME}"
echo "📍 リージョン: ${REGION}"
echo "🔒 暗号化: AES256"
echo "📚 バージョニング: 有効"
echo "🚫 パブリックアクセス: ブロック"
echo ""
echo "次のステップ:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. infra/environments/${ENVIRONMENT}/main.tf を編集"
echo "   backend \"s3\" ブロックのコメントを外す"
echo ""
echo "2. Terraform を初期化してステートを移行"
echo "   cd infra/environments/${ENVIRONMENT}"
echo "   terraform init -migrate-state"
echo ""
echo "3. 確認プロンプトで 'yes' と入力"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 ヒント:"
echo "  - 本番環境の場合: bash scripts/create-s3-backend.sh prod"
echo "  - 開発環境の場合: bash scripts/create-s3-backend.sh development"
echo "  - バケット確認: aws s3 ls | grep feed-bower-terraform-state"
echo "  - バケット削除: aws s3 rb s3://${BUCKET_NAME} --force"
echo ""
