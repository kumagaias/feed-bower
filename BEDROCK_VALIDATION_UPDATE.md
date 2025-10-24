# Bedrock Agent フィード検証機能の更新

## 変更概要

Bedrock Agentに以下の機能を追加しました：

1. **有効なURLのみを返す検証機能**
2. **10件以上のフィードを返す要件**
3. **厳密なRSS/Atom検証ロジック**

## 変更内容

### 1. Bedrock Agent指示の更新 (`infra/modules/bedrock-agent/main.tf`)

#### 主な変更点：
- 推奨フィード数を10件以上に変更
- URL検証基準を詳細に記載
- `validateFeeds`アクションを使用するワークフローを追加

#### 検証基準：

**Content-Typeヘッダー（最も信頼性が高い）：**
- `application/rss+xml` - RSS専用
- `application/xml` - 汎用XML
- `text/xml` - 古い形式のXML
- `application/atom+xml` - Atomフィード
- `application/rdf+xml` - RSS 1.0形式

**レスポンスボディ（ヘッダーが不明確な場合）：**
- RSS 2.0: `<?xml version="1.0"?>` で始まり、`<rss version="2.0">`、`<channel>`、`<item>` 要素を含む
- Atom: `<feed xmlns="http://www.w3.org/2005/Atom">` と `<entry>` 要素を含む
- RSS 1.0: `<rdf:RDF>` タグとRDF名前空間を含む

### 2. Lambda関数の検証ロジック強化 (`infra/modules/bedrock-agent/lambda/index.js`)

#### `validateFeedUrl()` 関数の改善：
- HEADリクエストからGETリクエストに変更（ボディも検証するため）
- Content-Typeヘッダーのチェックを強化
- レスポンスボディのXML構造を検証
- RSS 2.0、Atom、RSS 1.0の各形式を判別

#### 検証プロセス：
1. HTTPステータスコードが200であることを確認
2. Content-Typeヘッダーをチェック
3. レスポンスボディの最初の10KBを取得
4. XML宣言の存在を確認
5. RSS/Atomの必須要素（`<rss>`, `<feed>`, `<channel>`, `<item>`, `<entry>`）を確認
6. 両方の基準を満たす場合のみ有効と判定

#### `handleValidation()` 関数の改善：
- 検証結果に詳細情報を追加（Content-Type、検証詳細）
- ログ出力を強化（有効/無効なフィードの詳細）
- Bedrock Agent形式のレスポンスを返す

### 3. API スキーマの更新

`/validate-feeds` エンドポイントは既に定義されており、以下のパラメータを受け付けます：

```json
{
  "action": "validate",
  "feedUrls": [
    "https://example.com/feed.xml",
    "https://example.com/rss"
  ]
}
```

レスポンス：
```json
{
  "validFeeds": [
    {
      "url": "https://example.com/feed.xml",
      "valid": true,
      "title": "Example Feed",
      "description": "Feed description",
      "statusCode": 200,
      "contentType": "application/rss+xml",
      "validationDetails": {
        "hasValidContentType": true,
        "hasValidBody": true
      }
    }
  ],
  "invalidFeeds": [
    {
      "url": "https://example.com/invalid",
      "valid": false,
      "error": "Invalid feed",
      "statusCode": 404
    }
  ],
  "validCount": 1,
  "invalidCount": 1,
  "total": 2
}
```

## デプロイ手順

### 1. Lambda関数のDockerイメージをビルド

```bash
cd infra/modules/bedrock-agent/lambda
docker build -t feed-bower-bedrock-lambda:latest .
```

### 2. ECRにプッシュ

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージにタグ付け
docker tag feed-bower-bedrock-lambda:latest \
  <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com/feed-bower-bedrock-lambda-production:latest

# プッシュ
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com/feed-bower-bedrock-lambda-production:latest
```

### 3. Terraformで更新を適用

```bash
cd infra/environments/production

# 変更内容を確認
terraform plan

# 適用
terraform apply
```

### 4. Bedrock Agentの準備

Terraform applyが完了すると、Bedrock Agentが自動的に更新されます。
`prepare_agent = true` が設定されているため、変更は自動的に反映されます。

## テスト方法

### 1. Bedrock Playgroundでテスト

AWS ConsoleのBedrock Playgroundで以下のプロンプトを試してください：

```
SRE に関するフィードを10件以上推奨してください
```

期待される動作：
1. Agentが15-20件の候補URLを生成
2. `validateFeeds`アクションを呼び出して検証
3. 有効なURLのみを10件以上返す

### 2. スクリプトでテスト

```bash
# Bedrock Agentを直接テスト
python3 scripts/test-bedrock-agent.py

# または
bash scripts/test-bedrock-agent-direct.sh
```

### 3. API経由でテスト

```bash
curl -X POST https://api.feed-bower.net/api/feeds/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"keywords": ["SRE", "DevOps"]}'
```

## SREフィードの例

テスト用のSREフィードURL：

1. Google SRE Blog: `https://sre.google/`
2. Blameless SRE Blog: `https://www.blameless.com/blog`
3. Gremlin SRE Blog: `https://www.gremlin.com/community/tutorials/`
4. Honeycomb SRE Blog: `https://www.honeycomb.io/blog/`
5. Datadog Engineering Blog: `https://www.datadoghq.com/blog/engineering/`

注意: これらのURLは実際のRSSフィードURLではない可能性があります。
Bedrock Agentは適切なRSSフィードURLを見つける必要があります。

## トラブルシューティング

### 検証が失敗する場合

1. **タイムアウト**: Lambda関数のタイムアウトを30秒に設定済み
2. **ネットワークエラー**: VPC設定を確認（現在はVPC外で実行）
3. **Content-Type不一致**: ボディ検証にフォールバック

### Bedrock Agentが10件未満を返す場合

1. CloudWatchログを確認: `/aws/lambda/feed-bower-production-feed-search`
2. 検証結果を確認: `validCount` と `invalidCount`
3. 候補URLを増やす: Agentの指示を調整

### Lambda関数のログ確認

```bash
aws logs tail /aws/lambda/feed-bower-production-feed-search --follow
```

## 次のステップ

1. **パフォーマンス最適化**: 並列検証の最適化
2. **キャッシュ追加**: 検証結果をキャッシュ
3. **メトリクス追加**: CloudWatchメトリクスで検証成功率を追跡
4. **フィードデータベース拡充**: より多くのSREフィードを追加

## 参考資料

- [AWS Bedrock Agent Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom Syndication Format](https://datatracker.ietf.org/doc/html/rfc4287)
- [RSS 1.0 Specification](http://web.resource.org/rss/1.0/spec)
