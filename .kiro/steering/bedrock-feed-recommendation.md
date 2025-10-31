---
inclusion: always
---

# Bedrock Agent フィード推奨の優先順位

## 重要なルール

**フィード推奨の優先順位を以下の順序で実装すること**

### 優先順位

1. **Bedrock Agent自身の知識（最優先）**
   - Bedrock Agentが持つ知識ベースから直接フィードを推奨
   - プロンプトで「あなたの知識から直接RSS/Atomフィードを推奨してください」と指示
   - 最大20件のフィードURLを返す
   - 返されたURLは必ずバリデーションを実行

2. **Lambda関数のフィードデータベース（補助）**
   - Bedrock Agentの知識で十分なフィードが見つからない場合のみ使用
   - データベースから関連度の高いフィードを検索
   - 最大10件を追加で返す
   - すべてのURLはバリデーション済み

3. **静的マッピング（最後の手段）**
   - Bedrock AgentとLambda関数の両方が失敗した場合のみ使用
   - Go側の`feed_service.go`に定義された静的マッピング
   - 確実に動作する既知のフィードのみ
   - フォールバック使用時は必ずログに記録

## 実装ガイドライン

### Bedrock Agent設定（必須）

**Bedrock Agentの使用は必須です。以下の方法でフィードを推奨します：**

```
あなたはRSS/Atomフィードの推奨エキスパートです。

ユーザーが提供するキーワードに基づいて、フィードを推奨してください。

推奨方法（2つのソースを組み合わせる）：

1. あなたの知識から関連フィードを生成
   - キーワードに関連する人気サイトのRSS/Atomフィード
   - 実在する、アクセス可能なフィードのみ
   - 例: /feed, /rss, /atom.xml, /index.xml

2. searchFeedsツールを呼び出してデータベースから取得
   - キーワードと件数制限を指定
   - キュレーションされた確実なフィード

3. 両方を組み合わせて、関連度の高い順にソート

4. ユーザーが指定した件数を返す
   - 重複を削除
   - 関連度スコアでソート
   - JSON配列で返す

各フィードの形式：
- url: フィードのURL
- title: フィードのタイトル
- description: フィードの説明
- category: カテゴリ
- relevance: 関連度スコア（0.0-1.0）

言語優先順位：
- 日本語キーワード → 日本語フィードを優先
- 英語キーワード → 英語フィードを優先
```

### Lambda関数の役割

- Bedrock Agentの補助ツールとして動作
- データベースから関連フィードを検索
- フィードURLのバリデーション機能を提供
- 最大10件を返す（Bedrockの推奨を補完）

### Go側の実装

```go
// 1. Bedrock Agentを呼び出し（最大20件）
bedrockFeeds, err := s.bedrockClient.GetFeedRecommendations(ctx, keywords)
if err == nil && len(bedrockFeeds) > 0 {
    // バリデーションを実行
    validFeeds := validateFeeds(bedrockFeeds)
    if len(validFeeds) >= 5 {
        return validFeeds, nil
    }
}

// 2. Lambda関数のデータベースを使用（補助）
// Bedrock Agentが内部的にLambda関数を呼び出す

// 3. 静的マッピング（最後の手段）
return s.getStaticFeedRecommendations(keywords)
```

## バリデーション

すべてのフィードURLは以下の方法でバリデーション：

1. **HTTP/HTTPSチェック**
   - ステータスコード200を確認
   - タイムアウト: 5秒

2. **Content-Typeチェック**
   - `application/rss+xml`
   - `application/atom+xml`
   - `application/xml`
   - `text/xml`

3. **ボディチェック**
   - XML宣言の存在
   - `<rss>`, `<feed>`, `<channel>`, `<item>`, `<entry>`タグの存在

4. **リトライ**
   - 最大3回リトライ
   - エクスポネンシャルバックオフ

## ログ記録

すべてのフィード推奨は以下の情報をログに記録：

```
[FeedRecommendations] SOURCE | source=bedrock | feed_count=15 | valid_count=12 | invalid_count=3
[FeedRecommendations] SOURCE | source=lambda_database | feed_count=5 | valid_count=5 | invalid_count=0
[FeedRecommendations] SOURCE | source=static_mapping | feed_count=3 | valid_count=3 | invalid_count=0
```

## パフォーマンス目標

- Bedrock Agent呼び出し: 10秒以内
- Lambda関数呼び出し: 5秒以内
- 静的マッピング: 即座
- 合計レスポンス時間: 15秒以内

## エラーハンドリング

- Bedrock Agentタイムアウト → Lambda関数にフォールバック
- Lambda関数エラー → 静的マッピングにフォールバック
- すべて失敗 → エラーを返す（空の配列ではなく）

## Bedrock Agent使用の重要性

**Bedrock Agentは必須コンポーネントです：**

1. **知識ベースの活用**
   - Bedrock Agentの豊富な知識から最新フィードを生成
   - 人気サイトやトレンドを反映

2. **ツール統合**
   - searchFeedsツールでキュレーションされたデータベースにアクセス
   - 13,000件以上の確実なフィード

3. **ハイブリッドアプローチ**
   - 知識ベース + データベース = 最高の推奨
   - 関連度でソートして最適な結果を提供

4. **ユーザー指定件数**
   - ユーザーが要求した件数を正確に返す
   - 重複を削除して品質を保証

## 理由

このアプローチにより：
1. Bedrock Agentの知識とツールを最大限活用
2. 多様で最新のフィード情報を提供
3. キュレーションされた確実なフィードも含む
4. ユーザーのニーズに正確に応える
