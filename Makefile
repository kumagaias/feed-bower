# Feed Bower API - Makefile

.PHONY: help install test test-frontend test-backend test-coverage clean build lint format dev-all dev-stop dev-frontend dev-backend

# Default target
help:
	@echo "Available commands:"
	@echo "  install        - Install all dependencies"
	@echo "  test           - Run all tests"
	@echo "  test-frontend  - Run frontend tests"
	@echo "  test-backend   - Run backend tests"
	@echo "  test-coverage  - Run tests with coverage"
	@echo "  build          - Build all components"
	@echo "  lint           - Run linters"
	@echo "  format         - Format code"
	@echo "  clean          - Clean build artifacts"
	@echo "  dev-all        - Start all development services (frontend, backend, docker)"
	@echo "  dev-stop       - Stop all development services"
	@echo "  dev-frontend   - Start frontend development server only"
	@echo "  dev-backend    - Start backend development server only"

# Install dependencies
install:
	@echo "Installing frontend dependencies..."
	cd front && npm ci
	@echo "Installing backend dependencies..."
	cd back && go mod download
	@echo "✅ All dependencies installed"

# Run all tests with type-checking and linting
test: 
	@echo "Running comprehensive test suite..."
	@echo "1. Frontend type-checking..."
	cd front && npm run type-check
	@echo "2. Frontend linting..."
	cd front && npm run lint
	@echo "3. Frontend tests..."
	cd front && npm test -- --watchAll=false
	@echo "4. Backend linting..."
	cd back && go vet ./...
	cd back && gofmt -s -l . | (! grep .)
	@echo "5. Backend tests..."
	cd back && go test -v ./internal/service ./internal/handler ./internal/middleware ./pkg/...
	@echo "✅ All tests, type-checking, and linting completed"

# Frontend tests
test-frontend:
	@echo "Running frontend tests..."
	cd front && npm test -- --watchAll=false --testPathIgnorePatterns="KeywordEditModal.test.tsx"
	@echo "✅ Frontend tests completed"

# Frontend tests with type checking and linting
test-frontend-full:
	@echo "Running full frontend tests..."
	cd front && npm run type-check
	cd front && npm run lint
	cd front && npm test -- --watchAll=false --testPathIgnorePatterns="KeywordEditModal.test.tsx"
	@echo "✅ Full frontend tests completed"

# Backend tests
test-backend:
	@echo "Running backend tests..."
	cd back && go vet ./...
	cd back && go test -v ./internal/service ./internal/handler ./internal/middleware ./pkg/...
	@echo "✅ Backend tests completed"

# Test with coverage
test-coverage:
	@echo "Running tests with coverage..."
	cd front && npm run test:coverage && npm run type-check && npm run lint
	cd back && go test -v -race -coverprofile=coverage.out -covermode=atomic ./...
	cd back && go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage reports generated"
	@echo "Frontend coverage: front/coverage/lcov-report/index.html"
	@echo "Backend coverage: back/coverage.html"

# Build all components
build:
	@echo "Building frontend..."
	cd front && npm run build
	@echo "Building backend..."
	cd back && go build -v ./...
	@echo "✅ All components built"

# Run linters
lint:
	@echo "Running frontend linter..."
	cd front && npm run lint
	@echo "Running backend linter..."
	cd back && go vet ./...
	cd back && gofmt -s -l .
	@echo "✅ Linting completed"

# Format code
format:
	@echo "Formatting frontend code..."
	cd front && npm run lint -- --fix || true
	@echo "Formatting backend code..."
	cd back && gofmt -s -w .
	@echo "✅ Code formatted"

# Clean build artifacts
clean:
	@echo "Cleaning frontend build..."
	cd front && rm -rf .next out coverage
	@echo "Cleaning backend build..."
	cd back && rm -f coverage.out coverage.html
	cd back && go clean
	@echo "✅ Build artifacts cleaned"

# Development helpers
dev-frontend:
	@echo "Starting frontend development server..."
	cd front && npm run dev

dev-backend:
	@echo "Starting backend development server..."
	cd back && go run ./cmd/lambda

# Hot reload development (requires air: go install github.com/air-verse/air@latest)
dev-backend-hot:
	@echo "Starting backend development server with hot reload..."
	cd back && air

# Start all development services (frontend, backend, docker)
dev-all:
	@echo "🚀 Starting all development services..."
	@echo "Press Ctrl+C to stop all services"
	@./scripts/dev-all.sh

# Start all development services with hot reload (requires air)
dev-all-hot:
	@echo "🚀 Starting all development services with hot reload..."
	@echo "Press Ctrl+C to stop all services"
	@./scripts/dev-all.sh

# Stop all development services
dev-stop:
	@echo "🛑 Stopping all development services..."
	@./scripts/dev-stop.sh

# Quick test (for development)
test-quick:
	@echo "Running quick tests..."
	cd front && npm test -- --passWithNoTests --testPathIgnorePatterns="KeywordEditModal.test.tsx"
	cd back && go test ./... -short
	@echo "✅ Quick tests completed"

# Development data helpers
create-dev-data:
	@echo "Creating development data..."
	@./scripts/create-dynamodb-tables-auto.sh
	@./scripts/create-dev-user-auto.sh
	@./scripts/create-dev-articles.sh
	@echo "✅ Development data created"

create-dev-articles:
	@echo "Creating development articles..."
	@./scripts/create-dev-articles.sh
	@echo "✅ Development articles created"

view-dev-data:
	@echo "Viewing development data..."
	@./scripts/view-dev-data.sh

create-dev-bower:
	@echo "Creating development bower with 15 feeds (3 per category)..."
	@./scripts/create-dev-bower-feeds.sh
	@echo "✅ Development bower and feeds created"

# Install Air for hot reload
install-air:
	@echo "Installing Air for hot reload..."
	@go install github.com/air-verse/air@latest || go install github.com/cosmtrek/air@v1.49.0
	@echo "✅ Air installed"
