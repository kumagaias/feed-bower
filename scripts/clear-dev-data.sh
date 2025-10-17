#!/bin/bash

# Feed Bower - Clear Development Data Script
# Clears all development data from DynamoDB Local

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CLEAR-DEV]${NC} $1"
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

# Check if DynamoDB Local is running
print_status "Checking DynamoDB Local connection..."
if ! curl -s "$DYNAMODB_ENDPOINT" > /dev/null; then
    print_error "DynamoDB Local is not running at $DYNAMODB_ENDPOINT"
    exit 1
fi

print_success "DynamoDB Local is running"

# Function to clear table
clear_table() {
    local table_name="$1"
    local key_name="$2"
    
    print_status "Clearing table: $table_name"
    
    # Get all items
    local items=$(aws dynamodb scan \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --table-name "$table_name" \
        --region ap-northeast-1 \
        --query "Items[].$key_name.S" \
        --output text 2>/dev/null)
    
    if [ -n "$items" ] && [ "$items" != "None" ]; then
        for item in $items; do
            aws dynamodb delete-item \
                --endpoint-url "$DYNAMODB_ENDPOINT" \
                --table-name "$table_name" \
                --key "{\"$key_name\":{\"S\":\"$item\"}}" \
                --region ap-northeast-1 > /dev/null 2>&1
            echo "  ✓ Deleted: $item"
        done
        print_success "Cleared table: $table_name"
    else
        print_status "Table $table_name is already empty"
    fi
}

# Clear all tables
print_status "Clearing all development data..."

clear_table "Users" "user_id"
clear_table "ChickStats" "user_id"
clear_table "Bowers" "bower_id"
clear_table "Feeds" "feed_id"
clear_table "Articles" "article_id"

print_success "All development data cleared!"
print_status "You can now run the development setup again with fresh data"