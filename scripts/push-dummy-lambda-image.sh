#!/bin/bash

# Lambda 用のダミー Docker イメージを ECR にプッシュするスクリプト
# 使用方法:
#   bash scripts/push-dummy-lambda-image.sh development
#   bash scripts/push-dummy-lambda-image.sh prod

set -e

# 環境を引数から取得（デフォルトは development）
ENVIRONMENT=${1:-development}
REGION=${AWS_REGION:-ap-northeast-1}
REPOSITORY_NAME="feed-bower-api-${ENVIRONMENT}"

echo "🌍 環境: ${ENVIRONMENT}"
echo "📍 リージョン: ${REGION}"
echo "📦 リポジトリ: ${REPOSITORY_NAME}"
echo ""

# AWS アカウント ID を取得
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${ECR_URL}/${REPOSITORY_NAME}:latest"

echo "🔑 AWS アカウント ID: ${ACCOUNT_ID}"
echo "🐳 イメージ URI: ${IMAGE_URI}"
echo ""

# ECR にログイン
echo "1️⃣  ECR にログイン中..."
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${ECR_URL}

echo "✅ ECR にログインしました"
echo ""

# 一時ディレクトリを作成
echo "2️⃣  一時ディレクトリを作成中..."
TEMP_DIR=$(mktemp -d)
cd ${TEMP_DIR}

echo "✅ 一時ディレクトリを作成しました: ${TEMP_DIR}"
echo ""

# ダミー Dockerfile を作成
echo "3️⃣  ダミー Dockerfile を作成中..."
cat > Dockerfile << 'EOF'
FROM public.ecr.aws/lambda/provided:al2023-x86_64

# 最小限のダミーハンドラー
RUN echo '#!/bin/bash' > /var/runtime/bootstrap && \
    echo 'while true; do' >> /var/runtime/bootstrap && \
    echo '  EVENT_DATA=$(curl -sS -LD "$HEADERS" -X GET "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next")' >> /var/runtime/bootstrap && \
    echo '  REQUEST_ID=$(grep -Fi Lambda-Runtime-Aws-Request-Id "$HEADERS" | tr -d "[:space:]" | cut -d: -f2)' >> /var/runtime/bootstrap && \
    echo '  curl -X POST "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/$REQUEST_ID/response" -d "{\"statusCode\":200,\"body\":\"Dummy Lambda\"}"' >> /var/runtime/bootstrap && \
    echo 'done' >> /var/runtime/bootstrap && \
    chmod +x /var/runtime/bootstrap

CMD [ "dummy.handler" ]
EOF

echo "✅ ダミー Dockerfile を作成しました"
echo ""

# Docker イメージをビルド
echo "4️⃣  Docker イメージをビルド中..."
DOCKER_BUILDKIT=0 docker build -t ${REPOSITORY_NAME}:latest .

echo "✅ Docker イメージをビルドしました"
echo ""

# 元のディレクトリに戻る
cd - > /dev/null

# タグ付け
echo "5️⃣  イメージにタグを付与中..."
docker tag ${REPOSITORY_NAME}:latest ${IMAGE_URI}

echo "✅ タグを付与しました"
echo ""

# ECR にプッシュ
echo "6️⃣  ECR にプッシュ中..."
docker push ${IMAGE_URI}

echo "✅ ECR にプッシュしました"
echo ""

# クリーンアップ
echo "7️⃣  クリーンアップ中..."
rm -rf ${TEMP_DIR}
docker rmi ${REPOSITORY_NAME}:latest ${IMAGE_URI} 2>/dev/null || true

echo "✅ クリーンアップしました"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ダミーイメージのプッシュが完了しました！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 イメージ URI: ${IMAGE_URI}"
echo ""
echo "次のステップ:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Terraform を再実行"
echo "   cd infra/environments/${ENVIRONMENT}"
echo "   terraform apply"
echo ""
echo "2. 後で実際の API イメージをビルドしてプッシュ"
echo "   cd back"
echo "   docker build -t ${REPOSITORY_NAME}:latest -f Dockerfile ."
echo "   docker tag ${REPOSITORY_NAME}:latest ${IMAGE_URI}"
echo "   docker push ${IMAGE_URI}"
echo ""
echo "3. Lambda 関数を更新"
echo "   cd infra/environments/${ENVIRONMENT}"
echo "   terraform apply -replace=module.lambda.aws_lambda_function.function"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
