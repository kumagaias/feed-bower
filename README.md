# Feed Bower

AIが見つける、あなただけのパーソナライズされたRSSフィード体験

## 概要

Feed Bowerは、キーワードベースでRSSフィードを整理し、鳥の巣（Bower）のように情報を育てるWebアプリケーションです。

## プロジェクトの現状

### 🚀 現在利用可能（プロトタイプ）

- ✅ **フロントエンド**: Next.js 15 + TypeScript + Tailwind CSS
- ✅ **バウアー管理**: キーワードベースでフィードを整理
- ✅ **記事表示**: モックデータでの記事一覧・詳細表示
- ✅ **ひよこ育成**: いいね・チェック機能でレベルアップ
- ✅ **多言語対応**: 日本語・英語切り替え
- ✅ **レスポンシブデザイン**: デスクトップ・モバイル対応

### 🔄 開発予定（本格実装）

- 🔨 **バックエンドAPI**: Go + AWS Lambda
- 🔨 **データベース**: DynamoDB
- 🔨 **実際のRSSフィード**: RSS取得・パース機能
- 🔨 **AI推薦**: Amazon Bedrock AgentCore統合
- 🔨 **インフラ**: Terraform + AWS
- 🔨 **CI/CD**: GitHub Actions

## 技術スタック

- **フロントエンド**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **バックエンド**: Go 1.23, AWS Lambda, ECR
- **インフラ**: AWS (Amplify, API Gateway, DynamoDB, Lambda), Terraform
- **CI/CD**: GitHub Actions

## プロジェクト構造

```
feed-bower/
├── back/go/              # バックエンド (Go + Lambda)
├── front/next.js/        # フロントエンド (Next.js)
├── infra/terraform/      # インフラ (Terraform)
├── prototype/            # プロトタイプ
└── .devcontainer/        # Dev Container設定
```

## 環境構築

### 前提条件

- **Node.js**: 24.x 以上
- **Go**: 1.23 以上
- **Docker Desktop**: コンテナ実行用
- **AWS CLI**: DynamoDB Local 操作用
- **Git**: バージョン管理

### セットアップ手順

#### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/feed-bower.git
cd feed-bower
```

#### 2. プロトタイプの起動（現在の実装）

```bash
# プロトタイプディレクトリに移動
cd prototype

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

プロトタイプは http://localhost:3000 でアクセス可能です。

#### 3. 本格開発環境のセットアップ（将来実装）

**Dev Container を使用する場合**:
- VS Code + Dev Containers 拡張機能が必要
- `.devcontainer/devcontainer.json` 設定後に利用可能

**手動セットアップの場合**:

```bash
# フロントエンド環境
cd front/next.js
npm install

# バックエンド環境
cd back/go
go mod init github.com/your-org/feed-bower
go mod tidy

# DynamoDB Local 起動
docker run -p 8000:8000 amazon/dynamodb-local

# DynamoDB テーブル作成
bash scripts/create-dynamodb-tables.sh
```

### アクセスURL

#### プロトタイプ環境
- **プロトタイプアプリ**: http://localhost:3000

#### 本格開発環境（将来）
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8080
- **DynamoDB Local**: http://localhost:8000
- **DynamoDB Admin**: http://localhost:8001

### 環境変数設定

開発環境で必要な環境変数:

```bash
# .env.local (フロントエンド)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_ENVIRONMENT=development

# .env (バックエンド)
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=ap-northeast-1
LOG_LEVEL=debug
```

## 開発

### プロトタイプ開発（現在）

```bash
cd prototype

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# Lint チェック
npm run lint
```

**利用可能な機能**:
- バウアー作成・編集・削除
- キーワード管理（ドラッグ&ドロップ）
- 記事一覧表示（モックデータ）
- いいね・チェック機能
- ひよこ育成システム
- 多言語切り替え（日本語・英語）

### 🤖 Task Completion Automation

We provide an automated system for post-task completion workflows:

```bash
# Interactive task completion flow execution
./scripts/complete-task.sh

# Or direct execution
./scripts/task-completion-flow.sh "Task Name" "Branch Name"
```

**Automated Tasks**:
- ✅ Unit test execution
- ✅ Lint checking  
- ✅ Build testing
- ✅ Automated commit & push
- ✅ PR creation
- ✅ AI-generated PR summaries

For details, see [Task Automation Guide](docs/task-automation.md).

### Full Development (Future Implementation)

#### Frontend

```bash
cd front/next.js

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build
npm run build
```

#### Backend

```bash
cd back/go

# Start development server (hot reload)
air

# Manual execution
go run cmd/lambda/main.go

# Run tests
go test ./...

# Integration tests (using DynamoDB Local)
go test ./... -tags=integration

# Build
go build -o bin/lambda cmd/lambda/main.go
```

#### DynamoDB Local 操作

```bash
# テーブル一覧確認
aws dynamodb list-tables --endpoint-url http://localhost:8000

# テーブル作成
bash scripts/create-dynamodb-tables.sh

# テーブル削除
aws dynamodb delete-table --table-name Users --endpoint-url http://localhost:8000
```

## Deployment

### Infrastructure Setup (Manual)

```bash
cd infra/terraform/environments/prod
terraform init
terraform plan
terraform apply
```

### Application Deployment (Automated)

- Automatic deployment when merged to main branch
- GitHub Actions execution

## トラブルシューティング

### よくある問題と解決策

#### プロトタイプが起動しない

```bash
# Node.js バージョン確認
node --version  # 24.x 以上が必要

# 依存関係の再インストール
cd prototype
rm -rf node_modules package-lock.json
npm install
```

#### DynamoDB Local に接続できない

```bash
# Docker コンテナ確認
docker ps

# DynamoDB Local 再起動
docker run -p 8000:8000 amazon/dynamodb-local

# AWS CLI 設定確認
aws configure list
```

#### Port Already in Use

```bash
# Check port usage
lsof -i :3000  # Frontend
lsof -i :8080  # Backend
lsof -i :8000  # DynamoDB Local

# Kill process
kill -9 <PID>
```

### 開発環境のリセット

```bash
# プロトタイプ環境リセット
cd prototype
rm -rf node_modules .next
npm install

# DynamoDB Local データリセット
docker stop $(docker ps -q --filter ancestor=amazon/dynamodb-local)
docker run -p 8000:8000 amazon/dynamodb-local
bash scripts/create-dynamodb-tables.sh
```

## ドキュメント

- [要件定義書](.kiro/specs/basic/requirements.md)
- [設計書](.kiro/specs/basic/design.md)
- [タスクリスト](.kiro/specs/basic/tasks.md)

## ライセンス

MIT

## 作成者

Feed Bower Team
