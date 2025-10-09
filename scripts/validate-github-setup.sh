#!/bin/bash

# GitHub Actions Setup Validation Script
# Usage: ./scripts/validate-github-setup.sh

set -e

echo "🔍 GitHub Actions Setup Validation"
echo "=================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a Git repository"
    exit 1
fi

echo "✅ Git repository detected"

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI (gh) is available"
    
    # Check if authenticated
    if gh auth status > /dev/null 2>&1; then
        echo "✅ GitHub CLI is authenticated"
        
        # Get repository info
        REPO_INFO=$(gh repo view --json name,owner,url 2>/dev/null || echo "")
        if [ -n "$REPO_INFO" ]; then
            REPO_NAME=$(echo "$REPO_INFO" | jq -r '.name')
            REPO_OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
            REPO_URL=$(echo "$REPO_INFO" | jq -r '.url')
            
            echo "✅ Repository: $REPO_OWNER/$REPO_NAME"
            echo "🔗 URL: $REPO_URL"
        else
            echo "⚠️  Could not retrieve repository information"
        fi
    else
        echo "❌ GitHub CLI is not authenticated"
        echo "   Run: gh auth login"
    fi
else
    echo "❌ GitHub CLI (gh) is not installed"
    echo "   Install: brew install gh"
fi

# Check for GitHub Actions workflows
if [ -d ".github/workflows" ]; then
    WORKFLOW_COUNT=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)
    echo "✅ GitHub Actions workflows directory exists ($WORKFLOW_COUNT workflows)"
    
    # List workflows
    echo "📋 Available workflows:"
    find .github/workflows -name "*.yml" -o -name "*.yaml" | while read -r workflow; do
        WORKFLOW_NAME=$(basename "$workflow")
        echo "   - $WORKFLOW_NAME"
    done
else
    echo "❌ No .github/workflows directory found"
fi

# Check for required files
echo ""
echo "📁 Required Files Check:"

FILES_TO_CHECK=(
    "scripts/task-completion-flow.sh"
    "scripts/complete-task.sh"
    ".github/workflows/pr-automation.yml"
    ".github/automation-config.yml"
    "docs/task-automation.md"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

# Check script permissions
echo ""
echo "🔐 Script Permissions Check:"

SCRIPTS_TO_CHECK=(
    "scripts/task-completion-flow.sh"
    "scripts/complete-task.sh"
)

for script in "${SCRIPTS_TO_CHECK[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "✅ $script (executable)"
        else
            echo "⚠️  $script (not executable - run: chmod +x $script)"
        fi
    fi
done

# Check for common issues
echo ""
echo "🔍 Common Issues Check:"

# Check if main branch exists
if git show-ref --verify --quiet refs/heads/main; then
    echo "✅ Main branch exists"
elif git show-ref --verify --quiet refs/heads/master; then
    echo "⚠️  Using 'master' branch (consider renaming to 'main')"
else
    echo "❌ No main/master branch found"
fi

# Check for uncommitted changes
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ No uncommitted changes"
else
    echo "⚠️  Uncommitted changes detected"
fi

# Check Node.js version (for prototype)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
    
    # Check if version is 24.x or higher
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -ge 24 ]; then
        echo "✅ Node.js version is compatible (24.x+)"
    else
        echo "⚠️  Node.js version may be too old (requires 24.x+)"
    fi
else
    echo "❌ Node.js not found"
fi

# Check Go version (for backend)
if command -v go &> /dev/null; then
    GO_VERSION=$(go version | awk '{print $3}')
    echo "✅ Go: $GO_VERSION"
else
    echo "⚠️  Go not found (required for backend development)"
fi

echo ""
echo "🎉 Validation Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Fix any ❌ issues above"
echo "2. Run: ./scripts/complete-task.sh to test the automation"
echo "3. Check GitHub repository settings if you encounter permission errors"