#!/bin/bash

# Feed Bower - Development Environment Startup Script
# Starts frontend, backend, and docker services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DEV]${NC} $1"
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

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down all services..."
    
    # Stop docker services
    if [ -f ".devcontainer/docker-compose.yml" ]; then
        print_status "Stopping Docker services..."
        docker-compose -f .devcontainer/docker-compose.yml down
    fi
    
    # Kill background processes
    if [ ! -z "$FRONTEND_PID" ]; then
        print_status "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    

    
    # Wait a moment for graceful shutdown
    sleep 2
    
    # Force kill if still running
    if [ ! -z "$FRONTEND_PID" ]; then
        kill -9 $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill -9 $BACKEND_PID 2>/dev/null || true
    fi
    
    print_success "All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "Starting Feed Bower development environment..."

# Check if required directories exist
if [ ! -d "front" ]; then
    print_error "Frontend directory not found!"
    exit 1
fi

if [ ! -d "back" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

# Start Docker services
print_status "Starting Docker services (DynamoDB Local, Magnito)..."
if [ -f ".devcontainer/docker-compose.yml" ]; then
    docker-compose -f .devcontainer/docker-compose.yml up -d dynamodb-local dynamodb-admin magnito
    print_success "Docker services started"
    print_status "DynamoDB Local: http://localhost:8000"
    print_status "DynamoDB Admin: http://localhost:8001"
    print_status "Magnito (Cognito): http://localhost:9229"
else
    print_warning "Docker compose file not found, skipping Docker services"
fi

# Wait for services to be ready
print_status "Waiting for DynamoDB Local and Magnito to be ready..."
sleep 5

# Create DynamoDB tables
print_status "Creating DynamoDB tables..."
if ./scripts/create-dynamodb-tables-auto.sh; then
    print_success "DynamoDB tables created successfully"
    
    # Create Magnito user first
    print_status "Creating Magnito development user..."
    if ./scripts/create-cognito-local-user.sh; then
        print_success "Magnito user created successfully"
    else
        print_warning "Magnito user creation failed, but continuing..."
    fi
    
    # Then sync Cognito and DynamoDB users
    print_status "Syncing Cognito and DynamoDB users..."
    
    # Show detailed user sync process
    print_status "Checking existing users before sync..."
    aws dynamodb scan \
        --endpoint-url http://localhost:8000 \
        --table-name Users \
        --region ap-northeast-1 \
        --output table \
        --query 'Items[].{UserID:user_id.S,Email:email.S,Name:name.S}' 2>/dev/null || print_warning "Could not scan existing users"
    
    # Capture the output from the user sync script
    USER_SYNC_OUTPUT=$(./scripts/sync-cognito-dynamodb-user.sh 2>&1)
    USER_SYNC_EXIT_CODE=$?
    
    echo "$USER_SYNC_OUTPUT"
    
    if [ $USER_SYNC_EXIT_CODE -eq 0 ]; then
        print_success "User sync completed successfully"
        
        # Extract the synced user ID from the output
        SYNCED_USER_ID=$(echo "$USER_SYNC_OUTPUT" | grep "SYNCED_USER_ID=" | cut -d'=' -f2)
        
        if [ -n "$SYNCED_USER_ID" ]; then
            ACTUAL_DEV_USER_ID="$SYNCED_USER_ID"
            print_success "User synced with ID: $ACTUAL_DEV_USER_ID"
        fi
        
        # Verify user was synced
        sleep 2
        USER_COUNT=$(aws dynamodb scan --endpoint-url http://localhost:8000 --table-name Users --select COUNT --region ap-northeast-1 --output text --query 'Count' 2>/dev/null || echo "0")
        print_status "Users in database: $USER_COUNT"
        
        # Show all users for debugging
        print_status "All users in database after sync:"
        aws dynamodb scan \
            --endpoint-url http://localhost:8000 \
            --table-name Users \
            --region ap-northeast-1 \
            --output table \
            --query 'Items[].{UserID:user_id.S,Email:email.S,Name:name.S,CreatedAt:created_at.N}' 2>/dev/null || print_warning "Could not fetch user details"
            
    else
        print_warning "User sync failed, but continuing..."
    fi
    
else
    print_warning "DynamoDB table creation failed, but continuing..."
fi

# Start Backend with hot reload first
print_status "Starting backend server with hot reload..."
cd back

# Create log files for real-time monitoring
BACKEND_LOG_FILE="../tmp/backend.log"
mkdir -p ../tmp

# Check if air is installed
if command -v air >/dev/null 2>&1; then
    print_status "Using Air for hot reload..."
    print_status "Backend logs will appear below with [BACKEND] prefix"
    echo -e "${BLUE}[BACKEND]${NC} =================================="
    # Start air with output piped through prefix
    air 2>&1 | while IFS= read -r line; do
        echo -e "${BLUE}[BACKEND]${NC} $line"
    done &
    BACKEND_PID=$!
else
    print_warning "Air not found, installing..."
    # Try the new air-verse package first
    if go install github.com/air-verse/air@latest 2>/dev/null; then
        print_status "Air installed successfully (air-verse), starting with hot reload..."
        print_status "Backend logs will appear below with [BACKEND] prefix"
        echo -e "${BLUE}[BACKEND]${NC} =================================="
        air 2>&1 | while IFS= read -r line; do
            echo -e "${BLUE}[BACKEND]${NC} $line"
        done &
        BACKEND_PID=$!
    elif go install github.com/cosmtrek/air@v1.49.0 2>/dev/null; then
        print_status "Air installed successfully (cosmtrek), starting with hot reload..."
        print_status "Backend logs will appear below with [BACKEND] prefix"
        echo -e "${BLUE}[BACKEND]${NC} =================================="
        air 2>&1 | while IFS= read -r line; do
            echo -e "${BLUE}[BACKEND]${NC} $line"
        done &
        BACKEND_PID=$!
    else
        print_warning "Air installation failed, falling back to standard go run..."
        print_status "Backend logs will appear below with [BACKEND] prefix"
        echo -e "${BLUE}[BACKEND]${NC} =================================="
        go run ./cmd/lambda 2>&1 | while IFS= read -r line; do
            echo -e "${BLUE}[BACKEND]${NC} $line"
        done &
        BACKEND_PID=$!
    fi
fi

cd ..
print_success "Backend server started with hot reload (PID: $BACKEND_PID)"
print_status "Backend API: http://localhost:8080"

# Wait a moment for backend to start
sleep 3

# Wait for backend to fully initialize
sleep 2

# Create development data after backend is running
print_status "Creating development bower with 60 feeds..."

# Get the actual user ID from the Users table (Cognito creates dynamic IDs)
print_status "Getting actual user ID from database..."

# Retry logic for user lookup (database might need time to sync)
ACTUAL_USER_ID=""
for i in {1..3}; do
    print_status "Searching for user with email: dev@feed-bower.local (attempt $i/3)"
    
    # Show all users in table for debugging
    print_status "All users in database:"
    aws dynamodb scan \
        --endpoint-url http://localhost:8000 \
        --table-name Users \
        --region ap-northeast-1 \
        --output table \
        --query 'Items[].{UserID:user_id.S,Email:email.S,Name:name.S}' 2>/dev/null || print_warning "Could not scan users"
    
    # Try to find the specific user
    ACTUAL_USER_ID=$(aws dynamodb scan \
        --endpoint-url http://localhost:8000 \
        --table-name Users \
        --filter-expression "email = :email" \
        --expression-attribute-values '{":email":{"S":"dev@feed-bower.local"}}' \
        --region ap-northeast-1 \
        --output text \
        --query 'Items[0].user_id.S' 2>/dev/null)
    
    print_status "Search result: '$ACTUAL_USER_ID'"
    
    if [ -n "$ACTUAL_USER_ID" ] && [ "$ACTUAL_USER_ID" != "None" ]; then
        break
    fi
    
    print_status "User not found, retrying in 2 seconds..."
    sleep 2
done

if [ -n "$ACTUAL_DEV_USER_ID" ] && [ "$ACTUAL_DEV_USER_ID" != "None" ]; then
    print_success "Found user ID: $ACTUAL_DEV_USER_ID"
    
    # Pass the actual user ID to the bower creation script
    if ACTUAL_USER_ID="$ACTUAL_DEV_USER_ID" ./scripts/create-dev-bower-feeds.sh; then
        print_success "Development bower and feeds created successfully"
    else
        print_warning "Development bower creation failed, but continuing..."
    fi
else
    print_warning "Could not find user ID, skipping bower creation..."
fi

# Create development articles (after bower is created)
print_status "Creating development articles..."
if ./scripts/create-dev-articles.sh; then
    print_success "Development articles created successfully"
else
    print_warning "Development articles creation failed, but continuing..."
fi

# Start Frontend
print_status "Starting frontend server..."
cd front

# Start npm with output piped through prefix
npm run dev 2>&1 | while IFS= read -r line; do
    echo -e "${GREEN}[FRONTEND]${NC} $line"
done &
FRONTEND_PID=$!
cd ..
print_success "Frontend server started (PID: $FRONTEND_PID)"
print_status "Frontend App: http://localhost:3000"

# Print summary
echo ""
print_success "🎉 All services are running!"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  Frontend:      ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend API:   ${GREEN}http://localhost:8080${NC}"
echo -e "  DynamoDB:      ${GREEN}http://localhost:8000${NC}"
echo -e "  DynamoDB Admin:${GREEN}http://localhost:8001${NC}"
echo -e "  Magnito:       ${GREEN}http://localhost:9229${NC}"
echo ""
echo -e "${BLUE}Log Files:${NC}"
echo -e "  Backend:       ${YELLOW}tmp/backend.log${NC}"
echo -e "  Frontend:      ${YELLOW}tmp/frontend.log${NC}"
echo ""
echo -e "${BLUE}Development Login:${NC}"
echo -e "  Email:         ${GREEN}dev@feed-bower.local${NC}"
echo -e "  Password:      ${GREEN}DevPassword123!${NC}"
echo ""
echo -e "${YELLOW}📝 Logs are displayed in real-time below${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for user to stop
while true; do
    sleep 1
done