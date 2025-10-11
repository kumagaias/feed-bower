#!/bin/bash

echo "🚀 Setting up Feed Bower development environment..."

# Make sure we're in the workspace directory
cd /workspace

# Install Go tools
echo "🔧 Installing Go development tools..."
go install -v golang.org/x/tools/gopls@latest
go install -v github.com/go-delve/delve/cmd/dlv@latest
go install -v honnef.co/go/tools/cmd/staticcheck@latest

# Install frontend dependencies if package.json exists
if [ -f "front/next.js/package.json" ]; then
    echo "📦 Installing frontend dependencies..."
    cd front/next.js
    npm install
    cd /workspace
fi

# Install backend dependencies if go.mod exists
if [ -f "back/go/go.mod" ]; then
    echo "🔧 Installing backend dependencies..."
    cd back/go
    go mod download
    go mod tidy
    cd /workspace
fi

# Wait for DynamoDB Local to be ready
echo "⏳ Waiting for DynamoDB Local to be ready..."
timeout=30
counter=0
while ! curl -s http://localhost:8000 > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ DynamoDB Local failed to start within $timeout seconds"
        break
    fi
    echo "Waiting for DynamoDB Local... ($counter/$timeout)"
    sleep 1
    counter=$((counter + 1))
done

if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "✅ DynamoDB Local is ready!"
    
    # Create DynamoDB tables if script exists
    if [ -f "scripts/create-dynamodb-tables.sh" ]; then
        echo "🗄️ Creating DynamoDB tables..."
        bash scripts/create-dynamodb-tables.sh
    fi
else
    echo "⚠️ DynamoDB Local is not responding, but continuing setup..."
fi

# Set up Git configuration if not already set
if [ -z "$(git config --global user.name)" ]; then
    echo "📝 Setting up Git configuration..."
    echo "Please run the following commands to set up Git:"
    echo "  git config --global user.name 'Your Name'"
    echo "  git config --global user.email 'your.email@example.com'"
fi

echo "✨ Development environment setup complete!"
echo ""
echo "🌐 Available services:"
echo "  - Frontend (Next.js): http://localhost:3000"
echo "  - Backend (Go API): http://localhost:8080"
echo "  - DynamoDB Local: http://localhost:8000"
echo "  - DynamoDB Admin: http://localhost:8001"
echo ""
echo "🚀 To get started:"
echo "  1. Open a terminal and navigate to front/next.js"
echo "  2. Run 'npm run dev' to start the frontend"
echo "  3. Open another terminal and navigate to back/go"
echo "  4. Run 'go run cmd/lambda/main.go' to start the backend"
echo ""