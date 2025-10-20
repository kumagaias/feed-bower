# Feed Bower - 機能一覧

## 実装済み機能

### 1. バウアー編集後のフィード保持
- **問題**: バウアーを編集後、編集画面に戻るとフィードが消えていた
- **解決**: バックエンドAPIがバウアー更新時に最新のフィードを含めて返すように実装済み
- **実装場所**:
  - `back/internal/service/bower_service.go` - UpdateBower関数でフィードを読み込み
  - `front/src/hooks/useBowers.ts` - updateBower関数でフィードを保持
  - `front/src/components/BowerEditModal.tsx` - フィードの状態管理

### 2. Bedrock Agent Coreでフィード自動取得（準備中）
- **目的**: キーワードからAIが最適なRSS/Atomフィードを自動で見つける
- **現状**: 静的なキーワードマッピングで動作中
- **今後の実装**:
  - `back/pkg/bedrock/client.go` - Bedrock Agent Runtime クライアント（実装済み）
  - `back/internal/service/feed_service.go` - GetFeedRecommendations関数にBedrock統合（TODO）
  - Bedrock Agentの設定とデプロイが必要

#### Bedrock統合の手順
1. AWS Bedrock Agentを作成
2. フィード検索用のアクショングループを定義
3. 環境変数に`BEDROCK_AGENT_ID`と`BEDROCK_AGENT_ALIAS_ID`を設定
4. `feed_service.go`のTODOコメント部分を実装

## 使用方法

### バウアー編集
1. バウアー一覧から編集したいバウアーを選択
2. キーワードを追加・削除
3. フィードが自動的に追加される（キーワードベース）
4. 手動でフィードを追加・削除可能
5. 保存後、フィードは保持される

### フィード自動取得
- キーワードを設定すると、関連するフィードが自動的に提案される
- 現在は静的マッピング、将来的にはBedrock AIで動的に検索

## トラブルシューティング

### フィードが消える問題
- ブラウザのキャッシュをクリア
- バウアー一覧ページをリロード
- バックエンドログを確認: `make logs-api`

### Bedrock統合エラー
- Bedrock Agentが正しくデプロイされているか確認
- 環境変数が設定されているか確認
- IAMロールにBedrock実行権限があるか確認

## 今後の改善予定

1. **Bedrock Agent Core統合**
   - キーワードからAIが最適なフィードを検索
   - フィードの品質スコアリング
   - 多言語対応

2. **フィード管理の改善**
   - フィードのカテゴリ自動分類
   - 重複フィードの検出と統合
   - フィードの更新頻度の最適化

3. **ユーザー体験の向上**
   - フィードプレビューの高速化
   - オフライン対応
   - プッシュ通知
