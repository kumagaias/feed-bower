#!/bin/bash

# Test execution script with various options
# Usage: ./scripts/run-tests.sh [option]

set -e

OPTION=${1:-"all"}

echo "🧪 Feed Bower - Test Runner"
echo "=========================="

case $OPTION in
    "quick"|"q")
        echo "⚡ Running quick tests..."
        make test-quick
        ;;
    "frontend"|"f")
        echo "🎨 Running frontend tests..."
        make test-frontend
        ;;
    "backend"|"b")
        echo "🔧 Running backend tests..."
        make test-backend
        ;;
    "coverage"|"c")
        echo "📊 Running tests with coverage..."
        make test-coverage
        ;;
    "all"|"a")
        echo "🎯 Running all tests..."
        make test
        ;;
    "help"|"h")
        echo "Available options:"
        echo "  quick, q      - Run quick tests"
        echo "  frontend, f   - Run frontend tests only"
        echo "  backend, b    - Run backend tests only"
        echo "  coverage, c   - Run tests with coverage"
        echo "  all, a        - Run all tests (default)"
        echo "  help, h       - Show this help"
        ;;
    *)
        echo "❌ Unknown option: $OPTION"
        echo "Use './scripts/run-tests.sh help' for available options"
        exit 1
        ;;
esac

echo "✅ Test execution completed!"