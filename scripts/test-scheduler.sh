#!/bin/bash

# Test script for the feed fetch scheduler
# This script tests the scheduler functionality locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Testing Feed Fetch Scheduler"
print_status "=============================="

# Check if DynamoDB Local is running
print_status "Checking if DynamoDB Local is running..."
if ! aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-northeast-1 >/dev/null 2>&1; then
    print_error "DynamoDB Local is not running!"
    print_status "Please start it with: make dev-all"
    exit 1
fi
print_success "DynamoDB Local is running"

# Check if tables exist
print_status "Checking if required tables exist..."
TABLES=$(aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-northeast-1 --output text --query 'TableNames')

if ! echo "$TABLES" | grep -q "Feeds"; then
    print_error "Feeds table not found!"
    print_status "Please create tables with: ./scripts/create-dynamodb-tables-auto.sh"
    exit 1
fi

if ! echo "$TABLES" | grep -q "Articles"; then
    print_error "Articles table not found!"
    print_status "Please create tables with: ./scripts/create-dynamodb-tables-auto.sh"
    exit 1
fi
print_success "Required tables exist"

# Check if there are any feeds
print_status "Checking for existing feeds..."
FEED_COUNT=$(aws dynamodb scan --endpoint-url http://localhost:8000 --table-name Feeds --select COUNT --region ap-northeast-1 --output text --query 'Count' 2>/dev/null || echo "0")
print_status "Found $FEED_COUNT feeds in database"

if [ "$FEED_COUNT" -eq "0" ]; then
    print_error "No feeds found in database!"
    print_status "Please create development data with: make create-dev-bower"
    exit 1
fi

# Count articles before
print_status "Counting articles before scheduler run..."
ARTICLES_BEFORE=$(aws dynamodb scan --endpoint-url http://localhost:8000 --table-name Articles --select COUNT --region ap-northeast-1 --output text --query 'Count' 2>/dev/null || echo "0")
print_status "Articles before: $ARTICLES_BEFORE"

# Run the scheduler
print_status "Running feed fetch scheduler..."
print_status "This may take a few minutes depending on the number of feeds..."
echo ""

cd back
if go run cmd/lambda/main.go --mode=scheduler; then
    print_success "Scheduler completed successfully"
else
    print_error "Scheduler failed!"
    exit 1
fi
cd ..

echo ""

# Count articles after
print_status "Counting articles after scheduler run..."
ARTICLES_AFTER=$(aws dynamodb scan --endpoint-url http://localhost:8000 --table-name Articles --select COUNT --region ap-northeast-1 --output text --query 'Count' 2>/dev/null || echo "0")
print_status "Articles after: $ARTICLES_AFTER"

# Calculate difference
NEW_ARTICLES=$((ARTICLES_AFTER - ARTICLES_BEFORE))
print_success "New articles added: $NEW_ARTICLES"

# Show sample articles
print_status "Sample articles from database:"
aws dynamodb scan \
    --endpoint-url http://localhost:8000 \
    --table-name Articles \
    --limit 5 \
    --region ap-northeast-1 \
    --output table \
    --query 'Items[].{Title:title.S,FeedID:feed_id.S,PublishedAt:published_at.N}' 2>/dev/null || print_error "Could not fetch sample articles"

echo ""
print_success "✅ Scheduler test completed!"
print_status "You can view all articles in DynamoDB Admin: http://localhost:8001"
