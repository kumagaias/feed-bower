#!/bin/bash

# PR作成スクリプト
# Usage: ./scripts/create-pr.sh [branch-name] [pr-title]

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 引数の取得
BRANCH_NAME=${1:-""}
PR_TITLE=${2:-""}

# 現在のブランチを取得
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${BLUE}🚀 PR作成スクリプト${NC}"
echo ""

# mainブランチにいる場合は新しいブランチを作成
if [ "$CURRENT_BRANCH" = "main" ]; then
    if [ -z "$BRANCH_NAME" ]; then
        echo -e "${YELLOW}ブランチ名を入力してください:${NC}"
        read -r BRANCH_NAME
    fi
    
    echo -e "${BLUE}📝 新しいブランチを作成: ${BRANCH_NAME}${NC}"
    git checkout -b "$BRANCH_NAME"
    CURRENT_BRANCH="$BRANCH_NAME"
fi

# 変更があるか確認
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ コミットする変更がありません${NC}"
    exit 1
fi

# 変更内容を表示
echo -e "${BLUE}📋 変更されたファイル:${NC}"
git status --short
echo ""

# ステージング
echo -e "${BLUE}📦 変更をステージング...${NC}"
git add -A

# コミットメッセージの入力
if [ -z "$PR_TITLE" ]; then
    echo -e "${YELLOW}コミットメッセージを入力してください:${NC}"
    read -r PR_TITLE
fi

# コミット
echo -e "${BLUE}💾 コミット中...${NC}"
git commit -m "$PR_TITLE"

# プッシュ
echo -e "${BLUE}⬆️  プッシュ中...${NC}"
git push -u origin "$CURRENT_BRANCH"

# GitHub CLIがインストールされているか確認
if command -v gh &> /dev/null; then
    echo ""
    echo -e "${YELLOW}GitHub CLIでPRを作成しますか? (y/n)${NC}"
    read -r CREATE_PR
    
    if [ "$CREATE_PR" = "y" ] || [ "$CREATE_PR" = "Y" ]; then
        echo -e "${BLUE}🔗 PRを作成中...${NC}"
        gh pr create --title "$PR_TITLE" --body "## 変更内容

$(git log -1 --pretty=%B)

## チェックリスト
- [ ] テストが通ることを確認
- [ ] コードレビューを依頼
- [ ] ドキュメントを更新（必要な場合）

## 関連Issue
<!-- 関連するIssueがあればリンクを追加 -->
" --web
        echo -e "${GREEN}✅ PRが作成されました！${NC}"
    else
        echo ""
        echo -e "${GREEN}✅ プッシュが完了しました！${NC}"
        echo -e "${BLUE}以下のURLからPRを作成してください:${NC}"
        echo "https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/compare/$CURRENT_BRANCH?expand=1"
    fi
else
    echo ""
    echo -e "${GREEN}✅ プッシュが完了しました！${NC}"
    echo -e "${YELLOW}⚠️  GitHub CLIがインストールされていません${NC}"
    echo -e "${BLUE}以下のURLからPRを作成してください:${NC}"
    echo "https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/compare/$CURRENT_BRANCH?expand=1"
    echo ""
    echo -e "${BLUE}GitHub CLIをインストールするには:${NC}"
    echo "brew install gh"
fi

echo ""
echo -e "${GREEN}🎉 完了！${NC}"
