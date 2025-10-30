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

### Bedrock Agent設定

```
あなたはRSS/Atomフィードの推奨エキスパートです。

ユーザーが提供するキーワードに基づいて、あなたの知識から直接、関連性の高いRSS/Atomフィードを推奨してください。

重要な指示：
1. あなたの知識ベースから直接フィードURLを生成してください
2. 実在する、アクセス可能なRSS/AtomフィードのURLのみを推奨してください
3. 最大20件のフィードを推奨してください
4. 各フィードには以下の情報を含めてください：
   - url: フィードのURL
   - title: フィードのタイトル
   - description: フィードの説明
   - category: カテゴリ
   - relevance: 関連度スコア（0.0-1.0）

5. 日本語キーワードの場合は、日本語のフィードを優先してください
6. 英語キーワードの場合は、英語のフィードを優先してください

補助ツールとして、Lambda関数のフィードデータベースも利用できますが、
まずはあなた自身の知識から推奨を試みてください。
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

## 理由

この優先順位により：
1. Bedrock Agentの知識を最大限活用
2. 最新のフィード情報を提供
3. 確実なフォールバック機構
4. ユーザー体験の向上
