#!/bin/bash

# Feed Bower - Switch to Local Authentication Script
# Switches from AWS Cognito to local mock authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[LOCAL-AUTH]${NC} $1"
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

print_status "Switching to local authentication..."

# Backup current .env.local
if [ -f "front/.env.local" ]; then
    cp front/.env.local front/.env.local.backup
    print_status "Backed up current .env.local to .env.local.backup"
fi

# Copy local development environment variables
if [ -f "front/.env.local.development" ]; then
    cp front/.env.local.development front/.env.local
    print_success "Switched to local authentication configuration"
else
    print_error "Local development environment file not found!"
    exit 1
fi

print_success "Local authentication enabled!"
print_status "Development login credentials:"
echo "  Email: dev@feed-bower.local"
echo "  Password: password"
echo ""
print_warning "Restart your development server for changes to take effect"
print_status "Run: npm run dev (in the front directory)"