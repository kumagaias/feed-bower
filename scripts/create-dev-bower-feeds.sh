#!/bin/bash

# Feed Bower - Create Development Bower and Feeds Script
# Creates a bower with 60 feeds for the development user

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DEV-BOWER-FEEDS]${NC} $1"
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
DYNAMODB_REGION="ap-northeast-1"
TABLE_PREFIX=""
# Use actual user ID if provided, otherwise get from Cognito
DEV_USER_ID="${ACTUAL_USER_ID:-}"
BOWER_ID="dev-bower-main"

# Check if DynamoDB Local is running
print_status "Checking DynamoDB Local connection..."
if ! curl -s "$DYNAMODB_ENDPOINT" > /dev/null; then
    print_error "DynamoDB Local is not running at $DYNAMODB_ENDPOINT"
    print_status "Please start DynamoDB Local first with: make dev-all"
    exit 1
fi

print_success "DynamoDB Local is running"

# Function to create bower
create_bower() {
    local bower_id="$1"
    local user_id="$2"
    local name="$3"
    local keywords="$4"

    print_status "Creating bower: $name"

    local timestamp=$(date +%s)000  # milliseconds
    
    aws dynamodb put-item \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --table-name "${TABLE_PREFIX}Bowers" \
        --item "{
            \"bower_id\": {\"S\": \"$bower_id\"},
            \"user_id\": {\"S\": \"$user_id\"},
            \"name\": {\"S\": \"$name\"},
            \"keywords\": {\"L\": $keywords},
            \"color\": {\"S\": \"#14b8a6\"},
            \"is_public\": {\"BOOL\": false},
            \"created_at\": {\"N\": \"$timestamp\"},
            \"updated_at\": {\"N\": \"$timestamp\"}
        }" \
        --region "$DYNAMODB_REGION" > /dev/null

    if [ $? -eq 0 ]; then
        print_success "Created bower: $name"
    else
        print_error "Failed to create bower: $name"
        exit 1
    fi
}

# Function to create feed
create_feed() {
    local feed_id="$1"
    local bower_id="$2"
    local url="$3"
    local title="$4"
    local description="$5"
    local category="$6"

    local timestamp=$(date +%s)000  # milliseconds
    
    aws dynamodb put-item \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --table-name "${TABLE_PREFIX}Feeds" \
        --item "{
            \"feed_id\": {\"S\": \"$feed_id\"},
            \"bower_id\": {\"S\": \"$bower_id\"},
            \"url\": {\"S\": \"$url\"},
            \"title\": {\"S\": \"$title\"},
            \"description\": {\"S\": \"$description\"},
            \"category\": {\"S\": \"$category\"},
            \"is_custom\": {\"BOOL\": false},
            \"created_at\": {\"N\": \"$timestamp\"},
            \"updated_at\": {\"N\": \"$timestamp\"}
        }" \
        --region "$DYNAMODB_REGION" > /dev/null

    if [ $? -eq 0 ]; then
        echo "  ✓ $title"
    else
        echo "  ✗ Failed: $title"
    fi
}

print_status "Creating development bower and feeds..."

# Get the actual dev user ID
if [ -n "$ACTUAL_USER_ID" ]; then
    print_status "Using provided development user ID: $ACTUAL_USER_ID"
    DEV_USER_ID="$ACTUAL_USER_ID"
else
    print_status "Getting development user ID from Cognito..."
    
    # Get Cognito user ID first
    COGNITO_ENDPOINT="http://localhost:9229"
    USER_POOL_ID="local_xSR9dPrp8"
    COGNITO_REGION="ap-northeast-1"
    DEV_EMAIL="dev@feed-bower.local"
    
    # Get Cognito user data
    COGNITO_USER_DATA=$(aws cognito-idp list-users \
        --endpoint-url "$COGNITO_ENDPOINT" \
        --user-pool-id "$USER_POOL_ID" \
        --region "$COGNITO_REGION" \
        --output json \
        --query "Users[?Attributes[?Name=='email' && Value=='$DEV_EMAIL']]" 2>/dev/null)
    
    if [ -z "$COGNITO_USER_DATA" ] || [ "$COGNITO_USER_DATA" = "[]" ]; then
        print_error "Cognito user not found for email: $DEV_EMAIL"
        exit 1
    fi
    
    # Extract Cognito user ID (sub attribute)
    DEV_USER_ID=$(echo "$COGNITO_USER_DATA" | jq -r '.[0].Attributes[] | select(.Name=="sub") | .Value')
    
    if [ -z "$DEV_USER_ID" ] || [ "$DEV_USER_ID" = "null" ]; then
        print_error "Failed to get Cognito user ID"
        exit 1
    fi
    
    print_status "Found Cognito user ID: $DEV_USER_ID"
fi

# Verify user exists in DynamoDB
USER_EXISTS=$(aws dynamodb get-item \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --table-name "${TABLE_PREFIX}Users" \
    --key "{\"user_id\":{\"S\":\"$DEV_USER_ID\"}}" \
    --region "$DYNAMODB_REGION" \
    --output text \
    --query 'Item.user_id.S' 2>/dev/null)

if [ -z "$USER_EXISTS" ] || [ "$USER_EXISTS" = "None" ]; then
    print_error "Development user $DEV_USER_ID not found!"
    exit 1
fi

print_success "Development user verified: $DEV_USER_ID"
ACTUAL_USER_ID="$DEV_USER_ID"

# Create the main development bower
keywords='[
    {"S": "AI"},
    {"S": "プログラミング"},
    {"S": "テクノロジー"},
    {"S": "デザイン"},
    {"S": "科学"}
]'

create_bower "$BOWER_ID" "$ACTUAL_USER_ID" "開発用メインバウアー" "$keywords"

# Create 15 feeds (3 per category)
print_status "Creating 15 feeds for the bower (3 per category)..."

# Technology feeds (3 feeds)
print_status "Adding Technology feeds (1-3)..."
create_feed "dev-feed-001" "$BOWER_ID" "https://techcrunch.com/feed/" "TechCrunch" "Latest technology news and startup information" "Technology"
create_feed "dev-feed-002" "$BOWER_ID" "https://www.theverge.com/rss/index.xml" "The Verge" "Technology, science, art, and culture" "Technology"
create_feed "dev-feed-003" "$BOWER_ID" "https://www.wired.com/feed/" "WIRED" "Technology and innovation news" "Technology"

# Programming feeds (3 feeds)
print_status "Adding Programming feeds (4-6)..."
create_feed "dev-feed-004" "$BOWER_ID" "https://dev.to/feed" "DEV Community" "Programming articles and tutorials" "Programming"
create_feed "dev-feed-005" "$BOWER_ID" "https://stackoverflow.blog/feed/" "Stack Overflow Blog" "Programming insights and news" "Programming"
create_feed "dev-feed-006" "$BOWER_ID" "https://github.blog/feed/" "GitHub Blog" "Developer tools and workflows" "Programming"

# AI/ML feeds (3 feeds)
print_status "Adding AI/ML feeds (7-9)..."
create_feed "dev-feed-007" "$BOWER_ID" "https://ai.googleblog.com/feeds/posts/default" "Google AI Blog" "Latest AI research and developments" "AI"
create_feed "dev-feed-008" "$BOWER_ID" "https://openai.com/blog/rss/" "OpenAI Blog" "OpenAI research and updates" "AI"
create_feed "dev-feed-009" "$BOWER_ID" "https://deepmind.com/blog/feed/basic/" "DeepMind Blog" "AI research from DeepMind" "AI"

# Design feeds (3 feeds)
print_status "Adding Design feeds (10-12)..."
create_feed "dev-feed-010" "$BOWER_ID" "https://dribbble.com/shots/popular.rss" "Dribbble Popular" "Popular design shots" "Design"
create_feed "dev-feed-011" "$BOWER_ID" "https://uxdesign.cc/feed" "UX Design" "User experience design articles" "Design"
create_feed "dev-feed-012" "$BOWER_ID" "https://www.smashingmagazine.com/feed/" "Smashing Magazine" "Web design and development" "Design"

# Science feeds (3 feeds)
print_status "Adding Science feeds (13-15)..."
create_feed "dev-feed-013" "$BOWER_ID" "https://www.nature.com/nature.rss" "Nature" "Latest scientific research" "Science"
create_feed "dev-feed-014" "$BOWER_ID" "https://www.science.org/rss/news_current.xml" "Science Magazine" "Science news and research" "Science"
create_feed "dev-feed-015" "$BOWER_ID" "https://www.newscientist.com/feed/home/" "New Scientist" "Science news and discoveries" "Science"

print_success "Development bower and feeds created successfully!"
print_status "Created:"
echo "  - 1 bower: 開発用メインバウアー"
echo "  - 15 feeds across 5 categories (3 each):"
echo "    • Technology: 3 feeds"
echo "    • Programming: 3 feeds" 
echo "    • AI/ML: 3 feeds"
echo "    • Design: 3 feeds"
echo "    • Science: 3 feeds"
echo ""
print_status "You can now view this bower at: http://localhost:3000/bowers"
print_status "Login with: dev@feed-bower.local / DevPassword123!"