#!/bin/bash

# Feed Bower - Switch to AWS Authentication Script
# Switches from local mock authentication to AWS Cognito

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[AWS-AUTH]${NC} $1"
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

print_status "Switching to AWS Cognito authentication..."

# Restore backup if it exists
if [ -f "front/.env.local.backup" ]; then
    cp front/.env.local.backup front/.env.local
    print_success "Restored AWS Cognito configuration from backup"
else
    # Create AWS configuration
    cat > front/.env.local << EOF
# AWS Cognito Configuration
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xSR9dPrp8
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=73ev8tq1pmg6bum65mnj6vu3nm
NEXT_PUBLIC_AWS_REGION=ap-northeast-1

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api

EOF
    print_success "Created AWS Cognito configuration"
fi

print_success "AWS Cognito authentication enabled!"
print_status "Development login credentials:"
echo "  Email: dev@feed-bower.local"
echo "  Password: DevPassword123!"
echo ""
print_warning "Restart your development server for changes to take effect"
print_status "Run: npm run dev (in the front directory)"