#!/bin/bash

# Feed Bower - View Development Data Script
# Shows development data in DynamoDB Local

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[VIEW-DATA]${NC} $1"
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

# Function to show table data
show_table_data() {
    local table_name="$1"
    local description="$2"
    
    print_status "=== $description ==="
    
    # Check if table exists
    if aws dynamodb describe-table --endpoint-url "$DYNAMODB_ENDPOINT" --table-name "${TABLE_PREFIX}$table_name" --region ap-northeast-1 >/dev/null 2>&1; then
        # Get item count
        local count=$(aws dynamodb scan --endpoint-url "$DYNAMODB_ENDPOINT" --table-name "${TABLE_PREFIX}$table_name" --select COUNT --region ap-northeast-1 --output text --query 'Count')
        echo "Items in table: $count"
        
        if [ "$count" -gt 0 ]; then
            # Show first few items
            echo ""
            aws dynamodb scan \
                --endpoint-url "$DYNAMODB_ENDPOINT" \
                --table-name "${TABLE_PREFIX}$table_name" \
                --limit 5 \
                --region ap-northeast-1 \
                --output table
        else
            print_warning "No items found in $table_name table"
        fi
    else
        print_error "Table ${TABLE_PREFIX}$table_name does not exist"
    fi
    echo ""
}

# Show all development data
print_status "Showing development data from DynamoDB Local..."
echo ""

show_table_data "Users" "Users Table"
show_table_data "Bowers" "Bowers Table" 
show_table_data "Feeds" "Feeds Table"
show_table_data "Articles" "Articles Table"

# Show quick summary
print_status "=== Quick Summary ==="

# Count items in each table
for table in "Users" "Bowers" "Feeds" "Articles"; do
    if aws dynamodb describe-table --endpoint-url "$DYNAMODB_ENDPOINT" --table-name "${TABLE_PREFIX}$table" --region ap-northeast-1 >/dev/null 2>&1; then
        count=$(aws dynamodb scan --endpoint-url "$DYNAMODB_ENDPOINT" --table-name "${TABLE_PREFIX}$table" --select COUNT --region ap-northeast-1 --output text --query 'Count' 2>/dev/null || echo "0")
        echo "$table: $count items"
    else
        echo "$table: Table not found"
    fi
done

echo ""
print_status "Access URLs:"
echo "  Frontend:      http://localhost:3000"
echo "  Backend API:   http://localhost:8080"
echo "  DynamoDB:      http://localhost:8000"
echo "  DynamoDB Admin: http://localhost:8001"
echo ""
print_status "Login credentials:"
echo "  Email:         dev@feed-bower.local"
echo "  Password:      password"