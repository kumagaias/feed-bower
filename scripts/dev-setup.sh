#!/bin/bash

# Development environment setup script
# Usage: ./scripts/dev-setup.sh

set -e

echo "🚀 Feed Bower - Development Setup"
echo "================================="

# Check if Makefile exists
if [ ! -f "Makefile" ]; then
    echo "❌ Makefile not found. Please run from project root."
    exit 1
fi

echo "📦 Installing all dependencies..."
make install

echo ""
echo "🧪 Running initial tests..."
make test-quick

echo ""
echo "🏗️  Building all components..."
make build

echo ""
echo "✅ Development environment setup completed!"
echo ""
echo "📋 Available commands:"
echo "  make help           - Show all available commands"
echo "  make test           - Run all tests"
echo "  make test-quick     - Run quick tests"
echo "  make test-coverage  - Run tests with coverage"
echo "  make build          - Build all components"
echo "  make lint           - Run linters"
echo "  make format         - Format code"
echo "  make clean          - Clean build artifacts"
echo ""
echo "🎯 Next steps:"
echo "  1. Start development servers:"
echo "     - Frontend: make dev-frontend"
echo "     - Backend: make dev-backend"
echo "  2. Run tests: ./scripts/run-tests.sh"
echo "  3. Complete tasks: ./scripts/complete-task.sh"