# Task Completion Automation Guide

The Feed Bower project provides an automated system for handling post-task completion workflows.

## 🎯 Automated Tasks

1. **Unit Test Execution** - Tests for prototype, frontend, and backend
2. **Lint Checking** - Code quality verification
3. **Build Testing** - Build error detection
4. **Git Operations** - Automated commit and push
5. **PR Creation** - Automated GitHub PR creation
6. **PR Summary Generation** - AI-powered change summaries

## 🚀 Usage

### Method 1: Interactive Script (Recommended)

```bash
# Run task completion flow interactively
./scripts/complete-task.sh
```

The script will prompt for:
- Completed task name
- Branch name (auto-generated but customizable)

### Method 2: Direct Execution

```bash
# Execute with direct parameters
./scripts/task-completion-flow.sh "Task Name" "branch-name"

# Example
./scripts/task-completion-flow.sh "Add README setup instructions" "feature/readme-setup"
```

## 📋 Detailed Execution Flow

### 1. Test Execution

#### Prototype Tests
```bash
cd prototype
npm run lint    # Lint checking (warnings allowed)
npm run build   # Build testing (errors allowed in prototype)
```

**Note**: The prototype environment allows build errors and lint warnings as it's a development prototype with intentional incomplete implementations.

#### Frontend Tests
```bash
cd front/next.js
npm run lint    # Lint checking
npm run build   # Build testing
npm test        # Unit tests (if available)
```

#### Backend Tests
```bash
cd back/go
go mod tidy     # Dependency management
go test ./...   # Unit tests
go build ./...  # Build testing
```

### 2. Git Operations

```bash
git add .                    # Stage changes
git commit -m "feat: ..."    # Automated commit
git checkout -b <branch>     # Branch creation (if needed)
git push origin <branch>     # Remote push
```

### 3. PR Creation (with GitHub CLI)

```bash
gh pr create \
  --title "feat: Task Name" \
  --body "Auto-generated PR description" \
  --base main \
  --head <branch>
```

## 🔧 Configuration Customization

Configuration file: `.github/automation-config.yml`

### Test Settings

```yaml
testing:
  on_test_failure: "continue"  # Continue on test failure
  run_tests:
    prototype: true
    frontend: true
    backend: true
  timeout_minutes: 10
```

### Git Settings

```yaml
git:
  auto_commit:
    enabled: true
    message_template: "feat: {task_name}..."
  auto_push:
    enabled: true
```

### PR Settings

```yaml
pull_request:
  auto_create:
    enabled: true
    base_branch: "main"
  template:
    title: "feat: {task_name}"
    labels: ["enhancement", "automated"]
```

## 🤖 GitHub Actions Automation

When a PR is created, the following are automatically executed:

### 1. Test & Validation Workflow
- Test execution for all components
- Security scanning
- Dependency checking

### 2. PR Summary Generation
- Analysis of changed files
- Commit history organization
- Recommended review points

### 3. Automated Comment Posting
AI-generated PR summaries are posted as comments.

## 📝 PR Summary Example

```markdown
## 🤖 AI-Generated PR Summary

### 📋 Basic Information
- **PR Number**: #123
- **Author**: @developer
- **Branch**: `feature/readme-setup` → `main`
- **Changed Files**: 3 files
- **Commits**: 1 commit

### 🔍 Change Analysis

#### 📚 Documentation Changes (1 file)
- `README.md`

### 🎯 Recommended Review Points
- [ ] Verify documentation accuracy
- [ ] Test setup instructions

### ✅ Automated Test Results
All automated tests completed successfully.
```

## 🛠️ Troubleshooting

### GitHub CLI Not Found

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login
```

### Test Failures

Set `on_test_failure: "continue"` in configuration to continue processing even when tests fail.

### Branch Already Exists

The script will switch to the existing branch and add commits there.

### PR Creation Fails

Create the PR manually. GitHub Actions will still automatically generate summaries.

## 🔒 Security Considerations

- Automatic secret detection
- Only allowed file extensions are processed
- Excluded directory configuration
- Templated automated commit messages

## 📞 Support

When issues occur:

1. Check logs: GitHub Actions execution logs
2. Verify configuration: `.github/automation-config.yml`
3. Manual execution: Run each step individually to identify issues

## 🎉 Best Practices

1. **Execute in small task units** - Split large changes into multiple tasks
2. **Test-focused** - Ensure automated tests pass
3. **Clear task names** - Improves PR summary quality
4. **Regular configuration review** - Adjust as the project grows