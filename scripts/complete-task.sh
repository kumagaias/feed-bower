#!/bin/bash

# Simple task completion execution script
# Usage: ./scripts/complete-task.sh

set -e

echo "🎯 Feed Bower - Task Completion Flow"
echo "===================================="

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current branch: $CURRENT_BRANCH"

# Input task name
echo ""
read -p "📝 Enter completed task name: " TASK_NAME

if [ -z "$TASK_NAME" ]; then
    echo "❌ Task name is required."
    exit 1
fi

# Generate branch name (automatic)
BRANCH_NAME="feature/$(echo "$TASK_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')"

echo "🌿 Generated branch name: $BRANCH_NAME"

# Confirmation
echo ""
read -p "Continue with this branch name? (y/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    read -p "🌿 Enter custom branch name: " CUSTOM_BRANCH
    if [ -n "$CUSTOM_BRANCH" ]; then
        BRANCH_NAME="$CUSTOM_BRANCH"
    else
        echo "❌ Branch name is required."
        exit 1
    fi
fi

echo ""
echo "🚀 Execution plan:"
echo "  📝 Task: $TASK_NAME"
echo "  🌿 Branch: $BRANCH_NAME"
echo "  🧪 Tests: Automated execution"
echo "  📤 Push: Automated execution"
echo "  🔗 PR Creation: Automated execution (with GitHub CLI)"

echo ""
read -p "Execute? (y/N): " FINAL_CONFIRM

if [[ ! "$FINAL_CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Execution cancelled."
    exit 0
fi

# Execute main script
echo ""
echo "🚀 Starting task completion flow..."
./scripts/task-completion-flow.sh "$TASK_NAME" "$BRANCH_NAME"