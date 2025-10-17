#!/bin/bash

# Feed Bower - Create Development Articles Script
# Creates sample articles for development and testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DEV-ARTICLES]${NC} $1"
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

# DynamoDB endpoint
DYNAMODB_ENDPOINT="http://localhost:8000"
TABLE_PREFIX=""

# Check if DynamoDB Local is running
print_status "Checking DynamoDB Local connection..."
if ! curl -s "$DYNAMODB_ENDPOINT" > /dev/null; then
    print_error "DynamoDB Local is not running at $DYNAMODB_ENDPOINT"
    print_status "Please start DynamoDB Local first with: make dev-all"
    exit 1
fi

print_success "DynamoDB Local is running"

# Function to create article
create_article() {
    local article_id="$1"
    local bower_id="$2"
    local feed_id="$3"
    local title="$4"
    local content="$5"
    local url="$6"
    local published_at="$7"
    local bower_name="$8"
    local liked="$9"
    local read="${10}"
    local image_url="${11}"

    local timestamp=$(date +%s)000  # milliseconds
    
    aws dynamodb put-item \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --table-name "${TABLE_PREFIX}Articles" \
        --item "{
            \"article_id\": {\"S\": \"$article_id\"},
            \"bower_id\": {\"S\": \"$bower_id\"},
            \"feed_id\": {\"S\": \"$feed_id\"},
            \"title\": {\"S\": \"$title\"},
            \"content\": {\"S\": \"$content\"},
            \"url\": {\"S\": \"$url\"},
            \"published_at\": {\"N\": \"$published_at\"},
            \"bower_name\": {\"S\": \"$bower_name\"},
            \"liked\": {\"BOOL\": $liked},
            \"read\": {\"BOOL\": $read},
            \"image_url\": {\"S\": \"$image_url\"},
            \"created_at\": {\"N\": \"$timestamp\"},
            \"updated_at\": {\"N\": \"$timestamp\"}
        }" \
        --region ap-northeast-1 > /dev/null

    if [ $? -eq 0 ]; then
        print_success "Created article: $title"
    else
        print_error "Failed to create article: $title"
    fi
}

# Function to create feed
create_feed() {
    local feed_id="$1"
    local bower_id="$2"
    local url="$3"
    local title="$4"
    local description="$5"

    aws dynamodb put-item \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --table-name "${TABLE_PREFIX}Feeds" \
        --item "{
            \"feed_id\": {\"S\": \"$feed_id\"},
            \"bower_id\": {\"S\": \"$bower_id\"},
            \"url\": {\"S\": \"$url\"},
            \"title\": {\"S\": \"$title\"},
            \"description\": {\"S\": \"$description\"},
            \"is_custom\": {\"BOOL\": false},
            \"created_at\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
            \"updated_at\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
        }" \
        --region ap-northeast-1 > /dev/null

    if [ $? -eq 0 ]; then
        print_success "Created feed: $title"
    else
        print_error "Failed to create feed: $title"
    fi
}

print_status "Creating development articles..."

# Get the actual development user ID from DynamoDB
print_status "Finding development user..."
DEV_USER_ID=$(aws dynamodb scan \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --table-name "${TABLE_PREFIX}Users" \
    --filter-expression "email = :email" \
    --expression-attribute-values '{":email":{"S":"dev@feed-bower.local"}}' \
    --region ap-northeast-1 \
    --query 'Items[0].user_id.S' \
    --output text 2>/dev/null)

if [ -z "$DEV_USER_ID" ] || [ "$DEV_USER_ID" = "None" ]; then
    print_error "Development user not found! Please create user first."
    exit 1
fi

print_success "Found development user: $DEV_USER_ID"

# Get the actual development bower ID
print_status "Finding development bower..."
DEV_BOWER_ID=$(aws dynamodb scan \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --table-name "${TABLE_PREFIX}Bowers" \
    --filter-expression "user_id = :user_id" \
    --expression-attribute-values "{\":user_id\":{\"S\":\"$DEV_USER_ID\"}}" \
    --region ap-northeast-1 \
    --query 'Items[0].bower_id.S' \
    --output text 2>/dev/null)

if [ -z "$DEV_BOWER_ID" ] || [ "$DEV_BOWER_ID" = "None" ]; then
    print_error "Development bower not found! Please create bower first."
    exit 1
fi

print_success "Found development bower: $DEV_BOWER_ID"

# Get feeds from the bower
print_status "Getting feeds from bower..."
FEED_IDS=$(aws dynamodb scan \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --table-name "${TABLE_PREFIX}Feeds" \
    --filter-expression "bower_id = :bower_id" \
    --expression-attribute-values "{\":bower_id\":{\"S\":\"$DEV_BOWER_ID\"}}" \
    --region ap-northeast-1 \
    --query 'Items[].feed_id.S' \
    --output text 2>/dev/null)

if [ -z "$FEED_IDS" ] || [ "$FEED_IDS" = "None" ]; then
    print_error "No feeds found in bower! Please add feeds first."
    exit 1
fi

# Convert space-separated string to array
FEED_ARRAY=($FEED_IDS)
print_success "Found ${#FEED_ARRAY[@]} feeds in bower"

# Get current timestamp for recent articles (Unix timestamp in milliseconds)
current_time=$(date +%s)000
one_hour_ago=$(($(date +%s) - 3600))000
two_hours_ago=$(($(date +%s) - 7200))000
one_day_ago=$(($(date +%s) - 86400))000
two_days_ago=$(($(date +%s) - 172800))000

# Create articles using actual bower and feed IDs
print_status "Creating development articles..."

# Get the first few feed IDs to use for articles
FEED_1=${FEED_ARRAY[0]}
FEED_2=${FEED_ARRAY[1]:-${FEED_ARRAY[0]}}
FEED_3=${FEED_ARRAY[2]:-${FEED_ARRAY[0]}}

print_status "Using feeds: $FEED_1, $FEED_2, $FEED_3"

# Get bower name for display
BOWER_NAME=$(aws dynamodb get-item \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --table-name "${TABLE_PREFIX}Bowers" \
    --key "{\"bower_id\":{\"S\":\"$DEV_BOWER_ID\"}}" \
    --region ap-northeast-1 \
    --query 'Item.name.S' \
    --output text 2>/dev/null)

# Create articles using actual IDs
create_article "dev-article-1" "$DEV_BOWER_ID" "$FEED_1" \
    "Next.js 15の新機能について" \
    "Next.js 15では多くの新機能が追加されました。特にApp Routerの改善により、より直感的な開発が可能になっています。新しいキャッシュシステムやサーバーコンポーネントの最適化により、パフォーマンスも大幅に向上しています。" \
    "https://nextjs.org/blog/next-15" \
    "$one_hour_ago" \
    "$BOWER_NAME" \
    false false \
    "https://via.placeholder.com/128x96/14b8a6/ffffff?text=Next.js"

create_article "dev-article-2" "$DEV_BOWER_ID" "$FEED_2" \
    "ChatGPTの新しいマルチモーダル機能" \
    "OpenAIが発表したChatGPTの新機能では、テキスト、画像、音声を同時に処理できるマルチモーダル機能が追加されました。これにより、より自然で直感的なAIとの対話が可能になります。" \
    "https://openai.com/blog/chatgpt-multimodal" \
    "$two_hours_ago" \
    "$BOWER_NAME" \
    true false \
    "https://via.placeholder.com/128x96/f59e0b/ffffff?text=ChatGPT"

create_article "dev-article-3" "$DEV_BOWER_ID" "$FEED_3" \
    "TypeScriptの型安全性向上のベストプラクティス" \
    "TypeScriptを使用することで、JavaScriptコードの型安全性を向上させることができます。最新のTypeScript 5.3では、新しい型推論機能や厳密な型チェックが追加され、開発効率とコード品質の両方を改善できます。" \
    "https://www.typescriptlang.org/docs/handbook/2/types.html" \
    "$one_day_ago" \
    "Tech News" \
    false true \
    "https://via.placeholder.com/128x96/3b82f6/ffffff?text=TypeScript"

# Create more articles using actual IDs
create_article "dev-article-4" "$DEV_BOWER_ID" "$FEED_1" \
    "React 18の新しいフックとConcurrent Features" \
    "React 18で導入された新しいフックについて詳しく解説します。useTransitionやuseDeferredValueなど、パフォーマンス向上に役立つ機能が追加されています。Concurrent Featuresにより、ユーザーエクスペリエンスが大幅に改善されます。" \
    "https://react.dev/blog/2022/03/29/react-v18" \
    "$two_hours_ago" \
    "$BOWER_NAME" \
    true false \
    "https://via.placeholder.com/128x96/8b5cf6/ffffff?text=React"

create_article "dev-article-5" "$DEV_BOWER_ID" "$FEED_2" \
    "量子コンピューティングの最新研究動向" \
    "量子コンピューティング分野での最新の研究成果について紹介します。量子もつれや量子重ね合わせの原理を活用した新しいアルゴリズムが開発され、従来のコンピューターでは解決困難な問題への応用が期待されています。" \
    "https://www.nature.com/articles/quantum-computing-2024" \
    "$one_day_ago" \
    "$BOWER_NAME" \
    false false \
    "https://via.placeholder.com/128x96/10b981/ffffff?text=Quantum"

create_article "dev-article-6" "$DEV_BOWER_ID" "$FEED_3" \
    "WebAssemblyによるWebアプリケーションの高速化" \
    "WebAssembly（WASM）を使用してWebアプリケーションのパフォーマンスを向上させる方法について解説します。C++やRustで書かれたコードをWebブラウザで実行することで、ネイティブアプリケーション並みの速度を実現できます。" \
    "https://webassembly.org/getting-started/developers-guide/" \
    "$two_days_ago" \
    "$BOWER_NAME" \
    true true \
    "https://via.placeholder.com/128x96/ef4444/ffffff?text=WASM"

# More recent articles for today
create_article "dev-article-7" "$DEV_BOWER_ID" "$FEED_1" \
    "AI駆動開発ツールの最新トレンド" \
    "GitHub CopilotやCursor、Windsurf AIなど、AI駆動の開発ツールが急速に進化しています。これらのツールは開発者の生産性を大幅に向上させ、コード品質の向上にも貢献しています。" \
    "https://github.blog/ai-powered-development" \
    "$current_time" \
    "$BOWER_NAME" \
    false false \
    "https://via.placeholder.com/128x96/6366f1/ffffff?text=AI+Dev"

create_article "dev-article-8" "$DEV_BOWER_ID" "$FEED_2" \
    "大規模言語モデルの効率的なファインチューニング手法" \
    "LoRAやQLoRAなどの効率的なファインチューニング手法について解説します。これらの手法により、限られた計算資源でも大規模言語モデルを特定のタスクに適応させることが可能になります。" \
    "https://arxiv.org/abs/2106.09685" \
    "$one_hour_ago" \
    "$BOWER_NAME" \
    true false \
    "https://via.placeholder.com/128x96/f97316/ffffff?text=LLM"

create_article "dev-article-9" "$DEV_BOWER_ID" "$FEED_3" \
    "CRISPR-Cas9技術の医療応用における最新進展" \
    "遺伝子編集技術CRISPR-Cas9の医療分野での応用が急速に進んでいます。がん治療や遺伝性疾患の治療において、画期的な成果が報告されており、個別化医療の実現に向けた重要な一歩となっています。" \
    "https://www.nature.com/articles/crispr-medical-applications" \
    "$current_time" \
    "$BOWER_NAME" \
    false false \
    "https://via.placeholder.com/128x96/84cc16/ffffff?text=CRISPR"

create_article "dev-article-10" "$DEV_BOWER_ID" "$FEED_1" \
    "Rustによるシステムプログラミングの実践" \
    "Rustプログラミング言語を使用したシステムプログラミングについて実践的に解説します。メモリ安全性とパフォーマンスを両立するRustの特徴を活かし、安全で高速なシステムソフトウェアを開発する方法を紹介します。" \
    "https://doc.rust-lang.org/book/ch01-00-getting-started.html" \
    "$two_hours_ago" \
    "$BOWER_NAME" \
    true true \
    "https://via.placeholder.com/128x96/ec4899/ffffff?text=Rust"

print_success "Development articles created successfully!"
print_status "Created 10 articles for development bower with various states (liked/read)"
print_status "You can now view articles at: http://localhost:3000/feeds"

echo ""
print_status "Article Summary:"
echo "  - Bower: $BOWER_NAME ($DEV_BOWER_ID)"
echo "  - User: $DEV_USER_ID"
echo "  - Articles: 10 articles"
echo "  - Feeds used: ${#FEED_ARRAY[@]} feeds"
echo "  - Liked articles: 4"
echo "  - Read articles: 3"
echo "  - Recent articles (last 2 hours): 6"
echo "  - Older articles (1-2 days): 4"