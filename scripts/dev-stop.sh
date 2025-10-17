#!/bin/bash

# Feed Bower - Development Environment Stop Script
# Stops all development services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DEV-STOP]${NC} $1"
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

print_status "Stopping all development services..."

# Stop Docker services
if [ -f ".devcontainer/docker-compose.yml" ]; then
    print_status "Stopping Docker services..."
    docker-compose -f .devcontainer/docker-compose.yml down
    print_success "Docker services stopped"
else
    print_warning "Docker compose file not found"
fi

# Kill Node.js processes (frontend)
print_status "Stopping frontend servers..."
pkill -f "next-server" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true

# Kill Go processes (backend)
print_status "Stopping backend servers..."
pkill -f "go run.*cmd/lambda" 2>/dev/null || true
pkill -f "lambda" 2>/dev/null || true

# Kill any remaining processes on common ports
print_status "Cleaning up processes on development ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  # Frontend
lsof -ti:8080 | xargs kill -9 2>/dev/null || true  # Backend

print_success "All development services stopped"