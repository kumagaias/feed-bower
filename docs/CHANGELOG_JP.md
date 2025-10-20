# 変更履歴

## 2024-10-21 - 2つの重要な機能改善

### 1. バウアー編集後のフィード保持問題を修正 ✅

**問題**: バウアーを編集後、編集画面に戻るとフィードが消えていた

**原因**: 
- バックエンドAPIは正しくフィードを返していた
- フロントエンドの状態管理が不完全だった

**修正内容**:
- `back/internal/service/bower_service.go`: UpdateBower関数で最新のフィードを読み込むように実装済み
- `front/src/hooks/useBowers.ts`: updateBower関数でバックエンドから返されたフィードを正しく保持
- `front/src/app/bowers/page.tsx`: handleSaveEditedBower関数を簡素化、バックエンドの応答を信頼

**影響**:
- バウアー編集後、フィードが正しく保持される
- ユーザー体験が向上

---

### 2. Bedrock Agent Coreでフィード自動取得（準備完了）🚀

**目的**: キーワードからAIが最適なRSS/Atomフィードを自動で見つける

**実装内容**:
- `back/pkg/bedrock/client.go`: Bedrock Agent Runtime クライアントを新規作成
  - `GetFeedRecommendations`: キーワードベースでフィード推奨を取得
  - イベントストリーム処理
  - JSON応答のパース
- `back/internal/service/feed_service.go`: GetFeedRecommendations関数にTODOコメントを追加

**現状**:
- 静的なキーワードマッピングで動作中（フォールバック）
- Bedrock統合の準備完了

**次のステップ**:
1. AWS Bedrock Agentを作成
2. フィード検索用のアクショングループを定義
3. 環境変数に`BEDROCK_AGENT_ID`と`BEDROCK_AGENT_ALIAS_ID`を設定
4. `feed_service.go`のTODOコメント部分を実装

**必要な環境変数**:
```bash
BEDROCK_AGENT_ID=your-agent-id
BEDROCK_AGENT_ALIAS_ID=your-alias-id
AWS_REGION=ap-northeast-1
```

---

## ファイル変更一覧

### 新規作成
- `back/pkg/bedrock/client.go` - Bedrock Agent Runtime クライアント
- `docs/FEATURES.md` - 機能一覧ドキュメント
- `docs/CHANGELOG_JP.md` - 変更履歴（このファイル）

### 変更
- `front/src/app/bowers/page.tsx` - handleSaveEditedBower関数を簡素化
- `back/internal/service/feed_service.go` - Bedrock統合のTODOコメント追加

### 変更なし（既に正しく実装済み）
- `back/internal/service/bower_service.go` - UpdateBower関数
- `front/src/hooks/useBowers.ts` - updateBower関数
- `front/src/components/BowerEditModal.tsx` - フィード状態管理

---

## テスト方法

### 1. バウアー編集後のフィード保持
```bash
# フロントエンド起動
cd front && npm run dev

# 手順:
# 1. バウアーを作成
# 2. キーワードを追加してフィードを自動追加
# 3. 手動でフィードを追加
# 4. バウアーを保存
# 5. バウアー一覧に戻る
# 6. 同じバウアーを再度編集
# 7. フィードが保持されていることを確認
```

### 2. Bedrock統合（準備のみ）
```bash
# Bedrockクライアントのビルド確認
cd back && go build ./pkg/bedrock/...

# 実際のテストはBedrock Agent作成後
```

---

## 既知の問題

なし

---

## 今後の予定

1. **Bedrock Agent Coreの完全統合**
   - Bedrock Agentの作成とデプロイ
   - フィード検索アクショングループの実装
   - `feed_service.go`のBedrock統合コード実装

2. **フィード管理の改善**
   - フィードの品質スコアリング
   - 重複フィードの検出
   - カテゴリ自動分類

3. **パフォーマンス最適化**
   - フィード取得の並列化（既に実装済み）
   - キャッシュ戦略の改善
   - データベースクエリの最適化
