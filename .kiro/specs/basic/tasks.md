# Feed Bower - 実装タスクリスト

## 概要

このタスクリストは、プロトタイプから本番環境への移行を段階的に実施するための詳細な手順です。
各タスクには確認事項、テスト項目、UI 確認項目が含まれています。

**プロトタイプの活用**:

- `prototype/` フォルダの既存コードを最大限活用
- 動作確認済みのコンポーネントを `front/next.js/` に移行
- 必要に応じて API 連携部分のみ修正

---

## フェーズ 1: 環境構築（1 週間）

### タスク 1.1: リポジトリ・ディレクトリ構造のセットアップ

**作業内容**:

- [x] リポジトリ作成
- [x] ディレクトリ構造作成（back/go, front/next.js, infra/terraform）
- [x] .gitignore 設定
- [x] README.md 作成

**確認事項**:

- [x] ディレクトリ構造が設計書通りか確認
- [x] .gitignore に機密情報（.env, terraform.tfstate）が含まれているか
- [x] README に環境構築手順が記載されているか

**テスト**:

```bash
# ディレクトリ構造確認
tree -L 2 -I 'node_modules|.git'
```

---

### タスク 1.2: Dev Container セットアップ

**作業内容**:

- [ ] .devcontainer/devcontainer.json 作成
- [ ] .devcontainer/docker-compose.yml 作成
- [ ] Dockerfile.frontend 作成（Node.js 24）
- [ ] Dockerfile.backend 作成（Go 1.23）
- [ ] セットアップスクリプト作成

**確認事項**:

- [ ] Dev Container が正常に起動するか
- [ ] フロントエンド・バックエンド両方のコンテナが起動するか
- [ ] DynamoDB Local が起動するか
- [ ] DynamoDB Admin (http://localhost:8001) にアクセスできるか

**テスト**:

```bash
# コンテナ起動確認
docker-compose ps

# DynamoDB Local 接続確認
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

---

### タスク 1.3: DynamoDB Local テーブル作成

**作業内容**:

### タスク 3.3: バウアー管理機能の統合

**目的**: バウアー CRUD 機能を API と統合

**実装内容**:

- [ ] `src/app/bowers/page.tsx` を API 連携に変更
- [ ] バウアー一覧取得 API 呼び出し
- [ ] バウアー作成 API 呼び出し
- [ ] バウアー編集 API 呼び出し
- [ ] バウアー削除 API 呼び出し
- [ ] ローディング状態の実装
- [ ] エラーハンドリング

**確認事項**:

- ✅ バウアーの作成・編集・削除が正常に動作する
- ✅ ローディング表示が正しく表示される
- ✅ エラーメッセージが適切に表示される
- 🧪 バウアー管理の E2E テストがパス
- 🚫 コンソールエラーがない
- 👁️ **UI 確認必須**

**テスト**:

```bash
# E2Eテスト
npm run test:e2e -- tests/bowers.spec.ts

# コンポーネントテスト
npm test -- src/app/bowers
```

**UI 確認**:

- 👁️ バウアー一覧ページでバウアーが表示される
- 👁️ 「バウアーを作成」ボタンをクリックして作成フローを完了
- 👁️ 作成したバウアーが一覧に表示される
- 👁️ バウアーの編集ボタンをクリックして編集できる
- 👁️ バウアーの削除ボタンをクリックして削除確認モーダルが表示される
- 👁️ 削除後、一覧から消える
- 👁️ ローディング中は 🐣 アイコンが表示される
- 👁️ エラー時は赤文字でメッセージが表示される

---

### タスク 3.4: フィード管理機能の統合

**目的**: フィード CRUD 機能を API と統合

**実装内容**:

- [ ] バウアー編集画面のフィード管理を API 連携
- [ ] フィード追加 API 呼び出し
- [ ] フィード削除 API 呼び出し
- [ ] フィードプレビュー API 呼び出し
- [ ] URL 検証の実装

**確認事項**:

- ✅ フィードの追加・削除が正常に動作する
- ✅ フィードプレビューが表示される
- ✅ URL 検証が正しく機能する
- 🧪 フィード管理の E2E テストがパス
- 🚫 コンソールエラーがない
- 👁️ **UI 確認必須**

**テスト**:

```bash
# E2Eテスト
npm run test:e2e -- tests/feeds.spec.ts

# バリデーションテスト
npm test -- src/lib/validation.test.ts
```

**UI 確認**:

- 👁️ バウアー編集画面でフィード URL を入力
- 👁️ 無効な URL を入力するとエラーメッセージが表示される
- 👁️ 有効な URL を入力して追加ボタンをクリック
- 👁️ フィードが一覧に追加される
- 👁️ プレビューボタンをクリックしてモーダルが表示される
- 👁️ フィード削除ボタンをクリックして削除される
- 👁️ 最後の 1 つのフィードは削除ボタンが非表示

---

### タスク 3.5: 記事表示機能の統合

**目的**: 記事一覧・詳細機能を API と統合

**実装内容**:

- [ ] `src/app/feeds/page.tsx` を API 連携に変更
- [ ] 記事一覧取得 API 呼び出し
- [ ] 無限スクロール実装
- [ ] いいね機能 API 連携
- [ ] チェック機能 API 連携
- [ ] 検索機能実装

**確認事項**:

- ✅ 記事一覧が正しく表示される
- ✅ 無限スクロールが正常に動作する
- ✅ いいね・チェックが正常に動作する
- ✅ 検索が正常に動作する
- 🧪 記事表示の E2E テストがパス
- 🚫 コンソールエラーがない
- 👁️ **UI 確認必須**

**テスト**:

```bash
# E2Eテスト
npm run test:e2e -- tests/articles.spec.ts

# 無限スクロールテスト
npm test -- src/app/feeds/page.test.tsx
```

**UI 確認**:

- 👁️ フィード画面で記事が 50 件表示される
- 👁️ スクロールすると 🐣 アイコンが表示され、次の 50 件が読み込まれる
- 👁️ 記事のいいねボタンをクリックしてハートが赤くなる
- 👁️ 日付のチェックボタンをクリックして色が変わる
- 👁️ チェック済の記事が透明度 70%になる
- 👁️ 検索バーにキーワードを入力して記事が絞り込まれる
- 👁️ 「全て開く/閉じる」ボタンで日付トグルが一括操作される
- 👁️ 記事をクリックして外部リンクが新規タブで開く

---

### タスク 3.6: ひよこ育成機能の統合

**目的**: ひよこステータス機能を API と統合

**実装内容**:

- [ ] `src/components/ChickIcon.tsx` を API 連携に変更
- [ ] ステータス取得 API 呼び出し
- [ ] ステータス更新 API 呼び出し
- [ ] いいね記事一覧取得 API 呼び出し
- [ ] アニメーション連携

**確認事項**:

- ✅ ひよこステータスが正しく表示される
- ✅ いいね・チェック時にステータスが更新される
- ✅ アニメーションが正常に動作する
- 🧪 ひよこ機能の E2E テストがパス
- 🚫 コンソールエラーがない
- 👁️ **UI 確認必須**

**テスト**:

```bash
# E2Eテスト
npm run test:e2e -- tests/chick.spec.ts

# アニメーションテスト
npm test -- src/components/ChickIcon.test.tsx
```

**UI 確認**:

- 👁️ 右下のひよこアイコンをクリックしてモーダルが開く
- 👁️ ステータスタブで総いいね数・チェック日数・経験値が表示される
- 👁️ お気に入りタブでいいねした記事一覧が表示される
- 👁️ 記事をいいねするとひよこがジャンプする
- 👁️ 日付をチェックするとひよこがジャンプする
- 👁️ レベルアップ時にひよこが回転＆拡大し、トーストが表示される
- 👁️ レベルに応じてひよこの絵文字が変わる（🐣→🐤→🐥→🐦）

---

## フェーズ 4: RSS 機能実装（2 週間）

### タスク 4.1: RSS パーサー実装

**目的**: RSS フィードを取得・パースする機能を実装

**実装内容**:

- [ ] `internal/service/rss_service.go` 実装
- [ ] RSS 2.0 パーサー
- [ ] Atom Feed パーサー
- [ ] 画像 URL 抽出
- [ ] エラーハンドリング

**確認事項**:

- ✅ RSS/Atom フィードが正しくパースされる
- ✅ 画像 URL が正しく抽出される
- ✅ 不正なフィードでもエラーにならない
- 🧪 RSS パーサーのテストが全てパス
- 🚫 パニックが発生しない

**テスト**:

```bash
# RSSパーサーテスト
go test ./internal/service/rss_service_test.go -v

# 実際のRSSフィードでテスト
go test ./internal/service/rss_service_test.go -v -run TestRealFeed
```

**UI 確認**: なし（バックエンドのみ）

---

### タスク 4.2: フィード取得スケジューラー

**目的**: 定期的に RSS フィードを取得する機能を実装

**実装内容**:

- [ ] EventBridge ルール作成（Terraform）
- [ ] Lambda 関数にスケジュール実行を追加
- [ ] 全フィードの記事を取得
- [ ] 重複チェック
- [ ] DynamoDB に保存

**確認事項**:

- ✅ EventBridge ルールが正しく設定される
- ✅ 定期実行が正常に動作する
- ✅ 記事が重複せずに保存される
- 🧪 スケジューラーのテストがパス
- 🚫 タイムアウトエラーがない

**テスト**:

```bash
# ローカルでスケジューラー実行
go run cmd/lambda/main.go --mode=scheduler

# DynamoDBに記事が保存されているか確認
aws dynamodb scan --table-name Articles --endpoint-url http://localhost:8000
```

**UI 確認**:

- 👁️ DynamoDB Admin で記事が保存されている
- 👁️ フィード画面で実際の記事が表示される

---

## フェーズ 5: インフラ構築（1 週間）

### タスク 5.1: Terraform モジュール作成

**目的**: AWS リソースを Terraform で管理

**実装内容**:

- [ ] `infra/terraform/modules/lambda/` 作成
- [ ] `infra/terraform/modules/dynamodb/` 作成
- [ ] `infra/terraform/modules/api-gateway/` 作成
- [ ] `infra/terraform/modules/ecr/` 作成
- [ ] `infra/terraform/modules/amplify/` 作成

**確認事項**:

- ✅ Terraform の構文が正しい
- ✅ モジュールが再利用可能
- 🚫 `terraform validate` がパスする

**テスト**:

```bash
cd infra/terraform

# 構文チェック
terraform fmt -check
terraform validate

# プラン確認（実行しない）
terraform plan
```

**UI 確認**: なし（インフラのみ）

---

### タスク 5.2: 開発環境デプロイ

**目的**: 開発環境にインフラをデプロイ

**実装内容**:

- [ ] `infra/terraform/environments/dev/` 設定
- [ ] DynamoDB テーブル作成
- [ ] Lambda 関数デプロイ
- [ ] API Gateway デプロイ
- [ ] Amplify Hosting セットアップ

**確認事項**:

- ✅ `terraform apply` が成功する
- ✅ 全てのリソースが作成される
- ✅ API Gateway のエンドポイントが取得できる
- ✅ Amplify アプリが作成される
- 🚫 Terraform エラーがない

**テスト**:

```bash
cd infra/terraform/environments/dev

# 初期化
terraform init

# プラン確認
terraform plan

# 適用
terraform apply

# 出力確認
terraform output
```

**UI 確認**:

- 👁️ AWS コンソールでリソースが作成されている
- 👁️ API Gateway の URL にアクセスできる
- 👁️ Amplify コンソールでアプリが表示される

---

### タスク 5.3: 本番環境デプロイ

**目的**: 本番環境にインフラをデプロイ

**実装内容**:

- [ ] `infra/terraform/environments/prod/` 設定
- [ ] 本番用の設定値を調整
  - Lambda メモリ: 2048MB
  - DynamoDB: プロビジョンド課金
  - CloudWatch: 30 日間保持
- [ ] 本番環境デプロイ

**確認事項**:

- ✅ `terraform apply` が成功する
- ✅ 本番用の設定が適用される
- ✅ カスタムドメインが設定される
- ✅ SSL 証明書が有効
- 🚫 Terraform エラーがない

**テスト**:

```bash
cd infra/terraform/environments/prod

# プラン確認（慎重に）
terraform plan

# 適用
terraform apply

# 動作確認
curl https://api.feed-bower.com/health
```

**UI 確認**:

- 👁️ 本番 URL にアクセスできる
- 👁️ HTTPS で接続できる
- 👁️ カスタムドメインが機能している

---

## フェーズ 6: テスト・最適化（1 週間）

### タスク 6.1: E2E テスト実装

**目的**: 全機能の E2E テストを実装

**実装内容**:

- [ ] Playwright セットアップ
- [ ] 認証フローの E2E テスト
- [ ] バウアー管理の E2E テスト
- [ ] フィード管理の E2E テスト
- [ ] 記事表示の E2E テスト
- [ ] ひよこ機能の E2E テスト

**確認事項**:

- ✅ 全ての E2E テストがパスする
- ✅ テストカバレッジが 80%以上
- 🧪 CI/CD で E2E テストが実行される
- 🚫 テスト実行時にエラーがない

**テスト**:

```bash
# E2Eテスト実行
npm run test:e2e

# ヘッドレスモードで実行
npm run test:e2e:ci

# カバレッジレポート
npm run test:coverage
```

**UI 確認**:

- 👁️ Playwright のレポートで全テストがパスしている

---

### タスク 6.2: パフォーマンス最適化

**目的**: アプリケーションのパフォーマンスを最適化

**実装内容**:

- [ ] Next.js Image コンポーネント使用
- [ ] コード分割（dynamic import）
- [ ] SWR でキャッシング実装
- [ ] Lambda コールドスタート対策
- [ ] DynamoDB クエリ最適化

**確認事項**:

- ✅ Lighthouse スコアが 90 以上
- ✅ 初回ロードが 3 秒以内
- ✅ Lambda 実行時間が 3 秒以内
- 🚫 パフォーマンス警告がない

**テスト**:

```bash
# Lighthouseテスト
npm run lighthouse

# バンドルサイズ確認
npm run analyze

# Lambda実行時間確認
aws lambda get-function --function-name feed-bower-api
```

**UI 確認**:

- 👁️ ページ遷移が高速
- 👁️ 画像の遅延読み込みが機能している
- 👁️ スクロールがスムーズ

---

### タスク 6.3: セキュリティ監査

**目的**: セキュリティ脆弱性をチェック

**実装内容**:

- [ ] 依存関係の脆弱性スキャン
- [ ] XSS 対策確認
- [ ] CSRF 対策確認
- [ ] 入力検証の確認
- [ ] IAM ロールの最小権限確認

**確認事項**:

- ✅ `npm audit` で脆弱性がない
- ✅ `go mod verify` がパスする
- ✅ XSS 対策が実装されている
- ✅ CSRF 対策が実装されている
- 🚫 セキュリティ警告がない

**テスト**:

```bash
# フロントエンド脆弱性スキャン
cd front/next.js
npm audit
npm audit fix

# バックエンド脆弱性スキャン
cd back/go
go list -json -m all | nancy sleuth

# IAMポリシー確認
aws iam get-role-policy --role-name feed-bower-lambda-role --policy-name lambda-policy
```

**UI 確認**:

- 👁️ XSS 攻撃が防げている（<script>タグが無効化される）
- 👁️ CSRF トークンが機能している

---

## フェーズ 7: ドキュメント整備（3 日）

### タスク 7.1: README 作成

**目的**: プロジェクトの README を作成

**実装内容**:

- [ ] ルート README.md 作成
- [ ] front/next.js/README.md 作成
- [ ] back/go/README.md 作成
- [ ] infra/terraform/README.md 作成
- [ ] セットアップ手順
- [ ] 開発手順
- [ ] デプロイ手順

**確認事項**:

- ✅ README の内容が正確
- ✅ セットアップ手順が実行できる
- 📝 全ての README が作成されている

**テスト**:

```bash
# READMEの手順を実際に実行して確認
# 新しい環境で手順通りにセットアップできるか確認
```

**UI 確認**: なし（ドキュメントのみ）

---

### タスク 7.2: API ドキュメント作成

**目的**: API 仕様書を作成

**実装内容**:

- [ ] OpenAPI 3.0 仕様書作成
- [ ] 全エンドポイントの定義
- [ ] リクエスト/レスポンス例
- [ ] エラーコード一覧
- [ ] Swagger UI セットアップ

**確認事項**:

- ✅ OpenAPI 仕様が正しい
- ✅ Swagger UI で表示できる
- 📝 全エンドポイントが文書化されている

**テスト**:

```bash
# OpenAPI仕様の検証
npx @redocly/cli lint openapi.yaml

# Swagger UI起動
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml -v $(pwd):/openapi swaggerapi/swagger-ui
```

**UI 確認**:

- 👁️ Swagger UI で API ドキュメントが表示される
- 👁️ Try it out で実際に API を呼び出せる

---

## フェーズ 8: 本番リリース（1 日）

### タスク 8.1: 本番デプロイ

**目的**: 本番環境にアプリケーションをデプロイ

**実装内容**:

- [ ] main ブランチにマージ
- [ ] GitHub Actions で自動デプロイ
- [ ] デプロイ完了確認
- [ ] 動作確認

**確認事項**:

- ✅ GitHub Actions が成功する
- ✅ フロントエンドが Amplify にデプロイされる
- ✅ バックエンドが Lambda にデプロイされる
- ✅ 全機能が正常に動作する
- 🚫 デプロイエラーがない
- 👁️ **本番環境での全機能確認必須**

**テスト**:

```bash
# デプロイ状況確認
gh run list

# 本番環境ヘルスチェック
curl https://api.feed-bower.com/health

# 本番環境動作確認
curl -X POST https://api.feed-bower.com/api/auth/guest
```

**UI 確認（本番環境）**:

- 👁️ https://feed-bower.com にアクセスできる
- 👁️ ゲストログインが動作する
- 👁️ バウアー作成が動作する
- 👁️ フィード追加が動作する
- 👁️ 記事一覧が表示される
- 👁️ いいね・チェックが動作する
- 👁️ ひよこアニメーションが動作する
- 👁️ 全ての画面でエラーがない
- 👁️ モバイル表示が正常
- 👁️ 日本語/英語切り替えが動作する

---

### タスク 8.2: モニタリング設定

**目的**: 本番環境の監視を設定

**実装内容**:

- [ ] CloudWatch ダッシュボード作成
- [ ] アラーム設定
  - Lambda エラー率 > 5%
  - API Gateway 5xx > 10 件/分
  - DynamoDB スロットリング
- [ ] ログ保持期間設定
- [ ] SNS 通知設定

**確認事項**:

- ✅ ダッシュボードが表示される
- ✅ アラームが正しく設定される
- ✅ テストアラートが通知される
- 🚫 設定エラーがない

**テスト**:

```bash
# アラームテスト
aws cloudwatch set-alarm-state \
  --alarm-name feed-bower-lambda-errors \
  --state-value ALARM \
  --state-reason "Testing alarm"

# ログ確認
aws logs tail /aws/lambda/feed-bower-api --follow
```

**UI 確認**:

- 👁️ CloudWatch ダッシュボードでメトリクスが表示される
- 👁️ アラーム通知がメールで届く

---

## 完了チェックリスト

### 全体確認

- [ ] 全てのタスクが完了している
- [ ] 全てのテストがパスしている
- [ ] ドキュメントが整備されている
- [ ] 本番環境が正常に動作している

### 品質確認

- [ ] コードカバレッジ 80%以上
- [ ] Lighthouse スコア 90 以上
- [ ] セキュリティ脆弱性なし
- [ ] パフォーマンス要件を満たしている

### デプロイ確認

- [ ] CI/CD パイプラインが動作している
- [ ] ロールバック手順が確認されている
- [ ] モニタリングが設定されている
- [ ] アラートが機能している

---

**作成者**: Kiro AI Assistant  
**最終更新**: 2024 年 10 月 9 日  
**バージョン**: 1.0

- [ ] scripts/create-dynamodb-tables.sh 作成
- [ ] Users テーブル作成スクリプト
- [ ] Bowers テーブル作成スクリプト
- [ ] Feeds テーブル作成スクリプト
- [ ] Articles テーブル作成スクリプト
- [ ] LikedArticles テーブル作成スクリプト
- [ ] ChickStats テーブル作成スクリプト

**確認事項**:

- [ ] 全テーブルが作成されているか
- [ ] GSI（Global Secondary Index）が正しく設定されているか
- [ ] テーブル名が設計書通りか

**テスト**:

```bash
# テーブル作成
bash scripts/create-dynamodb-tables.sh

# テーブル一覧確認
aws dynamodb list-tables --endpoint-url http://localhost:8000

# テーブル詳細確認
aws dynamodb describe-table --table-name Users --endpoint-url http://localhost:8000
```

---

## フェーズ 2: バックエンド実装（2 週間）

### タスク 2.1: Go プロジェクト初期化

**作業内容**:

- [ ] go.mod 初期化
- [ ] 必要なパッケージのインストール
  - AWS SDK for Go v2
  - Lambda Go
  - UUID 生成
  - JWT 認証
- [ ] ディレクトリ構造作成（cmd, internal, pkg）

**確認事項**:

- [ ] go.mod が正しく作成されているか
- [ ] 依存関係が解決されているか

**テスト**:

```bash
cd back/go
go mod init github.com/your-org/feed-bower
go mod tidy
go build ./...
```

---

### タスク 2.2: データモデル実装

**作業内容**:

- [ ] internal/model/user.go 作成
- [ ] internal/model/bower.go 作成
- [ ] internal/model/feed.go 作成
- [ ] internal/model/article.go 作成
- [ ] internal/model/chick.go 作成
- [ ] バリデーションタグ追加

**確認事項**:

- [ ] 全モデルが設計書のデータ構造と一致しているか
- [ ] JSON タグが正しく設定されているか
- [ ] バリデーションタグが適切か

**テスト**:

```bash
# ビルド確認
go build ./internal/model/...

# ユニットテスト
go test ./internal/model/... -v
```

---

### タスク 2.3: DynamoDB Repository 実装

**作業内容**:

- [ ] pkg/dynamodb/client.go 作成（DynamoDB クライアント）
- [ ] internal/repository/user_repository.go 実装
- [ ] internal/repository/bower_repository.go 実装
- [ ] internal/repository/feed_repository.go 実装
- [ ] internal/repository/article_repository.go 実装
- [ ] internal/repository/chick_repository.go 実装

**確認事項**:

- [ ] CRUD 操作が全て実装されているか
- [ ] エラーハンドリングが適切か
- [ ] DynamoDB Local で動作確認できるか

**テスト**:

```bash
# ユニットテスト（モック使用）
go test ./internal/repository/... -v

# 統合テスト（DynamoDB Local使用）
go test ./internal/repository/... -v -tags=integration
```

**テストケース例**:

- ユーザー作成・取得・更新・削除
- バウアー作成・一覧取得・削除
- GSI を使った検索

---

### タスク 2.4: Service Layer 実装

**作業内容**:

- [ ] internal/service/auth_service.go 実装
  - ゲストログイン
  - JWT トークン発行
- [ ] internal/service/bower_service.go 実装
  - バウアー CRUD
  - キーワード管理
- [ ] internal/service/feed_service.go 実装
  - フィード CRUD
  - URL バリデーション
- [ ] internal/service/article_service.go 実装
  - 記事取得・フィルタリング
  - いいね管理
- [ ] internal/service/chick_service.go 実装
  - ステータス更新
  - 経験値計算
- [ ] internal/service/rss_service.go 実装
  - RSS 取得・パース

**確認事項**:

- [ ] ビジネスロジックが正しく実装されているか
- [ ] エラーハンドリングが適切か
- [ ] トランザクション処理が必要な箇所で実装されているか

**テスト**:

```bash
# ユニットテスト
go test ./internal/service/... -v -cover

# カバレッジ確認
go test ./internal/service/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

**テストケース例**:

- 経験値計算ロジック（10p でレベルアップ）
- チェック日数の重複防止
- RSS フィードのパース

---

### タスク 2.5: Handler Layer 実装

**作業内容**:

- [ ] internal/handler/auth_handler.go 実装
- [ ] internal/handler/bower_handler.go 実装
- [ ] internal/handler/feed_handler.go 実装
- [ ] internal/handler/article_handler.go 実装
- [ ] internal/handler/chick_handler.go 実装
- [ ] リクエスト/レスポンス構造体定義
- [ ] バリデーション実装

**確認事項**:

- [ ] 全 API エンドポイントが実装されているか
- [ ] HTTP ステータスコードが適切か
- [ ] エラーレスポンスが統一されているか

**テスト**:

```bash
# ユニットテスト
go test ./internal/handler/... -v

# HTTPテスト
go test ./internal/handler/... -v -run TestHTTP
```

---

### タスク 2.6: Lambda エントリーポイント実装

**作業内容**:

- [ ] cmd/lambda/main.go 実装
- [ ] ルーティング設定
- [ ] ミドルウェア設定（CORS, 認証, ログ）
- [ ] エラーハンドリング

**確認事項**:

- [ ] ローカルで Lambda をエミュレートできるか
- [ ] 全エンドポイントにアクセスできるか
- [ ] CORS 設定が正しいか

**テスト**:

```bash
# ローカル実行
go run cmd/lambda/main.go

# 別ターミナルでAPIテスト
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/auth/guest
```

---

### タスク 2.7: Dockerfile 作成

**作業内容**:

- [ ] back/go/Dockerfile 作成
- [ ] マルチステージビルド設定
- [ ] 最小イメージサイズ最適化

**確認事項**:

- [ ] Docker イメージがビルドできるか
- [ ] イメージサイズが適切か（< 100MB 推奨）
- [ ] コンテナが正常に起動するか

**テスト**:

```bash
# ビルド
cd back/go
docker build -t feed-bower-api:latest .

# イメージサイズ確認
docker images feed-bower-api

# コンテナ起動
docker run -p 8080:8080 \
  -e DYNAMODB_ENDPOINT=http://host.docker.internal:8000 \
  feed-bower-api:latest

# 動作確認
curl http://localhost:8080/health
```

---

## フェーズ 3: フロントエンド実装（2 週間）

### タスク 3.1: Next.js プロジェクトセットアップ

**作業内容**:

- [ ] front/next.js プロジェクト作成
- [ ] 必要なパッケージインストール
  - Tailwind CSS
  - TypeScript
- [ ] prototype から共通設定をコピー
  - tailwind.config.js
  - tsconfig.json
  - next.config.js

**確認事項**:

- [ ] 開発サーバーが起動するか
- [ ] Tailwind CSS が動作するか
- [ ] TypeScript のビルドが通るか

**テスト**:

```bash
cd front/next.js
npm install
npm run dev
```

**UI 確認**:

- [ ] http://localhost:3000 にアクセスできる
- [ ] デフォルトページが表示される

---

### タスク 3.2: 型定義・共通ユーティリティ移行

**作業内容**:

- [ ] prototype/src/types/index.ts → front/next.js/src/types/ にコピー
- [ ] prototype/src/styles/colors.ts → front/next.js/src/styles/ にコピー
- [ ] prototype/src/lib/i18n.ts → front/next.js/src/lib/ にコピー
- [ ] API 連携用の型定義追加

**確認事項**:

- [ ] 型定義が正しくインポートできるか
- [ ] カラー定義が使用できるか
- [ ] 多言語対応が動作するか

**テスト**:

```bash
# TypeScript ビルド
npm run build

# 型チェック
npx tsc --noEmit
```

---

### タスク 3.3: Context・状態管理実装

**作業内容**:

- [ ] prototype/src/contexts/AppContext.tsx をベースに実装
- [ ] API 連携用の状態管理追加
- [ ] localStorage → API 切り替えロジック実装

**確認事項**:

- [ ] Context が正しく動作するか
- [ ] 状態の永続化が動作するか
- [ ] API エラー時のフォールバック処理があるか

**テスト**:

```bash
# ユニットテスト
npm test -- AppContext
```

---

### タスク 3.4: 共通コンポーネント移行

**作業内容**:

- [ ] prototype/src/components/Layout.tsx → 移行
- [ ] prototype/src/components/Sidebar.tsx → 移行
- [ ] prototype/src/components/MobileHeader.tsx → 移行
- [ ] prototype/src/components/Breadcrumb.tsx → 移行
- [ ] prototype/src/components/ChickIcon.tsx → 移行
- [ ] prototype/src/components/ArticleCard.tsx → 移行
- [ ] prototype/src/components/BowerCard.tsx → 移行
- [ ] prototype/src/components/BowerCreator.tsx → 移行

**確認事項**:

- [ ] 全コンポーネントがビルドエラーなくインポートできるか
- [ ] props の型定義が正しいか
- [ ] スタイルが正しく適用されるか

**テスト**:

```bash
# コンポーネントテスト
npm test -- components/

# Storybook（オプション）
npm run storybook
```

**UI 確認**:

- [ ] 各コンポーネントが正しく表示される
- [ ] レスポンシブデザインが動作する
- [ ] アニメーションが動作する

---

### タスク 3.5: API クライアント実装

**作業内容**:

- [ ] src/lib/api/client.ts 作成（Fetch ラッパー）
- [ ] src/lib/api/auth.ts 実装
- [ ] src/lib/api/bowers.ts 実装
- [ ] src/lib/api/feeds.ts 実装
- [ ] src/lib/api/articles.ts 実装
- [ ] src/lib/api/chick.ts 実装
- [ ] エラーハンドリング実装
- [ ] リトライロジック実装

**確認事項**:

- [ ] 全 API エンドポイントが呼び出せるか
- [ ] 認証トークンが正しく送信されるか
- [ ] エラーレスポンスが適切に処理されるか

**テスト**:

```bash
# APIクライアントテスト
npm test -- lib/api/
```

---

### タスク 3.6: ページ実装 - ランディングページ

**作業内容**:

- [ ] prototype/src/app/page.tsx をベースに実装
- [ ] ゲストログイン機能を API 連携
- [ ] ローディング状態の実装

**確認事項**:

- [ ] ゲストログインが動作するか
- [ ] ログイン後にリダイレクトされるか
- [ ] エラーメッセージが表示されるか

**テスト**:

```bash
# E2Eテスト
npm run test:e2e -- landing
```

**UI 確認**:

- [ ] ランディングページが正しく表示される
- [ ] ログインボタンが動作する
- [ ] ローディング表示が出る
- [ ] エラー時に適切なメッセージが表示される

---

### タスク 3.7: ページ実装 - フィード画面

**作業内容**:

- [ ] prototype/src/app/feeds/page.tsx をベースに実装
- [ ] 記事一覧取得を API 連携
- [ ] 無限スクロール実装
- [ ] いいね機能を API 連携
- [ ] チェック機能を API 連携
- [ ] 検索機能実装

**確認事項**:

- [ ] 記事一覧が表示されるか
- [ ] 無限スクロールが動作するか
- [ ] いいね・チェックが動作するか
- [ ] 検索が動作するか
- [ ] 日付トグルが動作するか

**テスト**:

```bash
# ページテスト
npm test -- app/feeds/

# E2Eテスト
npm run test:e2e -- feeds
```

**UI 確認**:

- [ ] 記事カードが正しく表示される
- [ ] 画像が左側に表示される
- [ ] いいねボタンが動作する
- [ ] チェックマークが動作する
- [ ] 日付トグルが動作する
- [ ] 「全て開く/閉じる」ボタンが動作する
- [ ] 無限スクロールでローディング（🐣）が表示される
- [ ] レスポンシブデザインが動作する

---

### タスク 3.8: ページ実装 - バウアー管理画面

**作業内容**:

- [ ] prototype/src/app/bowers/page.tsx をベースに実装
- [ ] バウアー一覧取得を API 連携
- [ ] バウアー作成を API 連携
- [ ] バウアー編集を API 連携
- [ ] バウアー削除を API 連携

**確認事項**:

- [ ] バウアー一覧が表示されるか
- [ ] バウアー作成が動作するか
- [ ] バウアー編集が動作するか
- [ ] バウアー削除が動作するか
- [ ] 検索が動作するか

**テスト**:

```bash
# ページテスト
npm test -- app/bowers/

# E2Eテスト
npm run test:e2e -- bowers
```

**UI 確認**:

- [ ] バウアーカードが正しく表示される
- [ ] 作成ボタンが動作する
- [ ] 編集ボタンが動作する
- [ ] 削除確認モーダルが表示される
- [ ] キーワードドラッグ&ドロップが動作する
- [ ] プレビューモーダルが動作する

---

### タスク 3.9: ページ実装 - お気に入り画面

**作業内容**:

- [ ] prototype/src/app/liked/page.tsx をベースに実装
- [ ] いいね記事一覧取得を API 連携

**確認事項**:

- [ ] いいね記事一覧が表示されるか
- [ ] いいね解除が動作するか

**テスト**:

```bash
# ページテスト
npm test -- app/liked/

# E2Eテスト
npm run test:e2e -- liked
```

**UI 確認**:

- [ ] いいね記事が正しく表示される
- [ ] いいね解除ボタンが動作する

---

### タスク 3.10: ひよこ育成システム実装

**作業内容**:

- [ ] prototype/src/components/ChickIcon.tsx の機能を API 連携
- [ ] ステータス取得を API 連携
- [ ] ステータス更新を API 連携
- [ ] アニメーション動作確認

**確認事項**:

- [ ] ひよこアイコンが表示されるか
- [ ] いいね時にジャンプアニメーションが動作するか
- [ ] チェック時にジャンプアニメーションが動作するか
- [ ] レベルアップ時にアニメーションが動作するか
- [ ] ステータスモーダルが表示されるか
- [ ] チェック日数が正しく表示されるか

**テスト**:

```bash
# コンポーネントテスト
npm test -- components/ChickIcon
```

**UI 確認**:

- [ ] 右下にひよこアイコンが表示される
- [ ] クリックでモーダルが開く
- [ ] ステータスタブが動作する
- [ ] お気に入りタブが動作する
- [ ] レベルに応じてアイコンが変わる（🐣→🐤→🐥→🐦）
- [ ] アニメーションがスムーズに動作する

---

## フェーズ 4: インフラ構築（1 週間）

### タスク 4.1: Terraform 初期化

**作業内容**:

- [ ] infra/terraform/modules/ 作成
- [ ] infra/terraform/environments/dev/ 作成
- [ ] infra/terraform/environments/prod/ 作成
- [ ] backend.tf 作成（S3 バックエンド設定）

**確認事項**:

- [ ] Terraform が初期化できるか
- [ ] State ファイルが S3 に保存されるか

**テスト**:

```bash
cd infra/terraform/environments/dev
terraform init
terraform validate
```

---

### タスク 4.2: DynamoDB テーブル作成（Terraform）

**作業内容**:

- [ ] modules/dynamodb/main.tf 作成
- [ ] 全テーブル定義
- [ ] GSI 定義

**確認事項**:

- [ ] terraform plan でエラーがないか
- [ ] テーブル定義が設計書通りか

**テスト**:

```bash
terraform plan
terraform apply -auto-approve

# テーブル確認
aws dynamodb list-tables
```

---

### タスク 4.3: ECR リポジトリ作成

**作業内容**:

- [ ] modules/ecr/main.tf 作成
- [ ] feed-bower-api リポジトリ作成

**確認事項**:

- [ ] ECR リポジトリが作成されるか
- [ ] ライフサイクルポリシーが設定されているか

**テスト**:

```bash
terraform apply

# ECR確認
aws ecr describe-repositories
```

---

### タスク 4.4: Lambda 関数作成

**作業内容**:

- [ ] modules/lambda/main.tf 作成
- [ ] IAM ロール作成
- [ ] 環境変数設定
- [ ] VPC 設定（オプション）

**確認事項**:

- [ ] Lambda 関数が作成されるか
- [ ] IAM ロールが適切か
- [ ] 環境変数が設定されているか

**テスト**:

```bash
terraform apply

# Lambda確認
aws lambda list-functions
aws lambda get-function --function-name feed-bower-api
```

---

### タスク 4.5: API Gateway 作成

**作業内容**:

- [ ] modules/api-gateway/main.tf 作成
- [ ] REST API 作成
- [ ] Lambda 統合設定
- [ ] CORS 設定
- [ ] カスタムドメイン設定（オプション）

**確認事項**:

- [ ] API Gateway が作成されるか
- [ ] Lambda と統合されているか
- [ ] CORS が正しく設定されているか

**テスト**:

```bash
terraform apply

# API Gateway確認
aws apigateway get-rest-apis

# エンドポイントテスト
curl https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/prod/health
```

---

### タスク 4.6: AWS Amplify Hosting セットアップ

**作業内容**:

- [ ] modules/amplify/main.tf 作成
- [ ] Amplify アプリ作成
- [ ] GitHub 連携設定
- [ ] ビルド設定
- [ ] 環境変数設定

**確認事項**:

- [ ] Amplify アプリが作成されるか
- [ ] GitHub リポジトリと連携されているか
- [ ] ビルド設定が正しいか

**テスト**:

```bash
terraform apply

# Amplify確認
aws amplify list-apps
```

---

## フェーズ 5: CI/CD・デプロイ（1 週間）

### タスク 5.1: GitHub Actions - フロントエンド

**作業内容**:

- [ ] .github/workflows/deploy-frontend.yml 作成
- [ ] ビルド・テストジョブ設定
- [ ] Amplify デプロイジョブ設定

**確認事項**:

- [ ] ワークフローが正常に実行されるか
- [ ] テストが通るか
- [ ] Amplify にデプロイされるか

**テスト**:

```bash
# ローカルでワークフロー検証
act -j deploy

# GitHub Actions実行確認
git push origin develop
```

**UI 確認**:

- [ ] Amplify の develop ブランチ環境にアクセスできる
- [ ] 全ページが正しく表示される
- [ ] API 連携が動作する

---

### タスク 5.2: GitHub Actions - バックエンド

**作業内容**:

- [ ] .github/workflows/deploy-backend.yml 作成
- [ ] ビルド・テストジョブ設定
- [ ] ECR プッシュジョブ設定
- [ ] Lambda 更新ジョブ設定

**確認事項**:

- [ ] ワークフローが正常に実行されるか
- [ ] テストが通るか
- [ ] ECR にイメージがプッシュされるか
- [ ] Lambda が更新されるか

**テスト**:

```bash
# GitHub Actions実行確認
git push origin develop

# Lambda更新確認
aws lambda get-function --function-name feed-bower-api

# API動作確認
curl https://<api-endpoint>/health
```

---

### タスク 5.3: GitHub Actions - PR チェック

**作業内容**:

- [ ] .github/workflows/pr-check.yml 作成
- [ ] Lint・テストジョブ設定

**確認事項**:

- [ ] PR 作成時にワークフローが実行されるか
- [ ] Lint・テストが通るか

**テスト**:

```bash
# PRを作成して確認
```

---

### タスク 5.4: 本番デプロイ

**作業内容**:

- [ ] main ブランチへマージ
- [ ] 本番環境デプロイ確認
- [ ] カスタムドメイン設定（オプション）
- [ ] SSL 証明書設定確認

**確認事項**:

- [ ] 本番環境にデプロイされるか
- [ ] 全機能が動作するか
- [ ] パフォーマンスが許容範囲か

**テスト**:

```bash
# 本番環境動作確認
curl https://feed-bower.com/api/health
```

**UI 確認（本番環境）**:

- [ ] ランディングページが表示される
- [ ] ゲストログインが動作する
- [ ] フィード画面が動作する
- [ ] バウアー管理が動作する
- [ ] お気に入りが動作する
- [ ] ひよこ育成が動作する
- [ ] レスポンシブデザインが動作する
- [ ] 多言語切り替えが動作する

---

## フェーズ 6: テスト・最適化（1 週間）

### タスク 6.1: E2E テスト実装

**作業内容**:

- [ ] Playwright セットアップ
- [ ] ユーザーフローテスト実装
  - ログイン → バウアー作成 → フィード閲覧
  - いいね → ひよこレベルアップ
  - チェック → 経験値獲得

**確認事項**:

- [ ] 全 E2E テストが通るか
- [ ] クリティカルパスがカバーされているか

**テスト**:

```bash
npm run test:e2e
```

---

### タスク 6.2: パフォーマンステスト

**作業内容**:

- [ ] Lighthouse スコア測定
- [ ] API レスポンスタイム測定
- [ ] 最適化実施

**確認事項**:

- [ ] Lighthouse スコア 90 以上
- [ ] API レスポンスタイム 1 秒以内
- [ ] 無限スクロールが 1 秒以内

**テスト**:

```bash
# Lighthouse
npx lighthouse https://feed-bower.com --view

# API負荷テスト
ab -n 1000 -c 10 https://<api-endpoint>/api/articles
```

---

### タスク 6.3: セキュリティ監査

**作業内容**:

- [ ] 依存関係の脆弱性チェック
- [ ] OWASP Top 10 チェック
- [ ] IAM ロール最小権限確認

**確認事項**:

- [ ] 脆弱性がないか
- [ ] セキュリティベストプラクティスに準拠しているか

**テスト**:

```bash
# フロントエンド
npm audit
npm audit fix

# バックエンド
go list -json -m all | nancy sleuth

# Terraform
tfsec infra/terraform/
```

---

## 完了条件

### 全体チェックリスト

**機能**:

- [ ] 全機能が動作する
- [ ] プロトタイプと同等以上の機能がある
- [ ] API 連携が正常に動作する

**テスト**:

- [ ] ユニットテストカバレッジ 80%以上
- [ ] E2E テストが全て通る
- [ ] パフォーマンステストが基準を満たす

**UI/UX**:

- [ ] デザインがプロトタイプと一致する
- [ ] レスポンシブデザインが動作する
- [ ] アニメーションがスムーズに動作する
- [ ] 多言語対応が動作する

**インフラ**:

- [ ] 本番環境にデプロイされている
- [ ] CI/CD が動作している
- [ ] モニタリングが設定されている

**ドキュメント**:

- [ ] README が更新されている
- [ ] API ドキュメントがある
- [ ] 運用手順書がある

---

**作成者**: Kiro AI Assistant  
**最終更新**: 2024 年 10 月 9 日  
**バージョン**: 1.0

- [ ] scripts/create-dynamodb-tables.sh 作成
- [ ] Users テーブル作成スクリプト
- [ ] Bowers テーブル作成スクリプト
- [ ] Feeds テーブル作成スクリプト
- [ ] Articles テーブル作成スクリプト
- [ ] LikedArticles テーブル作成スクリプト
- [ ] ChickStats テーブル作成スクリプト

**確認事項**:

- [ ] 全テーブルが作成されているか
- [ ] GSI（Global Secondary Index）が正しく設定されているか
- [ ] DynamoDB Admin でテーブル構造を確認

**テスト**:

```bash
# テーブル作成
bash scripts/create-dynamodb-tables.sh

# テーブル一覧確認
aws dynamodb list-tables --endpoint-url http://localhost:8000

# テーブル詳細確認
aws dynamodb describe-table --table-name Users --endpoint-url http://localhost:8000
```

---

## フェーズ 2: バックエンド実装（2 週間）

### タスク 2.1: Go プロジェクト初期化

**作業内容**:

- [ ] back/go/go.mod 初期化
- [ ] 必要なパッケージのインストール
  - AWS SDK for Go v2
  - Lambda runtime
  - UUID 生成
  - JWT 認証
- [ ] ディレクトリ構造作成（cmd, internal, pkg）

**確認事項**:

- [ ] go.mod が正しく作成されているか
- [ ] 依存関係が解決されているか

**テスト**:

```bash
cd back/go
go mod init github.com/your-org/feed-bower
go mod tidy
go build ./...
```

---

### タスク 2.2: データモデル実装

**作業内容**:

- [ ] internal/model/user.go 作成
- [ ] internal/model/bower.go 作成
- [ ] internal/model/feed.go 作成
- [ ] internal/model/article.go 作成
- [ ] internal/model/chick.go 作成
- [ ] バリデーションタグ追加

**確認事項**:

- [ ] 全モデルが設計書通りの構造か
- [ ] JSON タグが正しく設定されているか
- [ ] バリデーションタグが適切か

**テスト**:

```bash
go test ./internal/model/...
```

**テスト内容**:

- モデルの JSON 変換テスト
- バリデーションテスト

---

### タスク 2.3: Repository 層実装

**作業内容**:

- [ ] pkg/dynamodb/client.go 作成（DynamoDB クライアント）
- [ ] internal/repository/user_repository.go 実装
- [ ] internal/repository/bower_repository.go 実装
- [ ] internal/repository/feed_repository.go 実装
- [ ] internal/repository/article_repository.go 実装
- [ ] internal/repository/chick_repository.go 実装

**確認事項**:

- [ ] CRUD 操作が全て実装されているか
- [ ] エラーハンドリングが適切か
- [ ] DynamoDB Local で動作確認

**テスト**:

```bash
go test ./internal/repository/... -v
```

**テスト内容**:

- Create/Read/Update/Delete の各操作
- GSI を使った検索
- エラーケース（存在しない ID 等）

---

### タスク 2.4: Service 層実装

**作業内容**:

- [ ] internal/service/auth_service.go 実装
  - ゲストログイン
  - JWT トークン生成
- [ ] internal/service/bower_service.go 実装
  - バウアー作成・更新・削除
  - バウアー一覧取得
- [ ] internal/service/feed_service.go 実装
  - フィード追加・削除
  - フィードプレビュー
- [ ] internal/service/article_service.go 実装
  - 記事一覧取得
  - いいね・既読管理
- [ ] internal/service/chick_service.go 実装
  - ステータス更新
  - 経験値計算
- [ ] internal/service/rss_service.go 実装
  - RSS フィード取得
  - XML パース

**確認事項**:

- [ ] ビジネスロジックが正しく実装されているか
- [ ] トランザクション処理が適切か
- [ ] エラーハンドリングが適切か

**テスト**:

```bash
go test ./internal/service/... -v -cover
```

**テスト内容**:

- 各サービスの主要機能
- エッジケース
- エラーハンドリング
- カバレッジ 80% 以上

---

### タスク 2.5: Handler 層実装

**作業内容**:

- [ ] internal/handler/auth_handler.go 実装
- [ ] internal/handler/bower_handler.go 実装
- [ ] internal/handler/feed_handler.go 実装
- [ ] internal/handler/article_handler.go 実装
- [ ] internal/handler/chick_handler.go 実装
- [ ] internal/middleware/auth.go 実装（JWT 検証）
- [ ] internal/middleware/cors.go 実装
- [ ] internal/middleware/logger.go 実装

**確認事項**:

- [ ] リクエスト/レスポンスの形式が正しいか
- [ ] バリデーションが適切か
- [ ] ミドルウェアが正しく動作するか

**テスト**:

```bash
go test ./internal/handler/... -v
go test ./internal/middleware/... -v
```

**テスト内容**:

- 各エンドポイントのレスポンス
- バリデーションエラー
- 認証エラー

---

### タスク 2.6: Lambda エントリーポイント実装

**作業内容**:

- [ ] cmd/lambda/main.go 作成
- [ ] ルーティング設定
- [ ] Lambda ハンドラー実装
- [ ] 環境変数読み込み

**確認事項**:

- [ ] ローカルで起動できるか
- [ ] 全エンドポイントにアクセスできるか
- [ ] 環境変数が正しく読み込まれるか

**テスト**:

```bash
# ローカル起動
cd back/go
go run cmd/lambda/main.go

# 別ターミナルで API テスト
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/auth/guest
```

---

### タスク 2.7: Dockerfile 作成

**作業内容**:

- [ ] back/go/Dockerfile 作成
- [ ] マルチステージビルド設定
- [ ] 最小イメージサイズ最適化

**確認事項**:

- [ ] Docker イメージがビルドできるか
- [ ] イメージサイズが適切か（< 100MB）
- [ ] コンテナが正常に起動するか

**テスト**:

```bash
# ビルド
docker build -t feed-bower-api:latest .

# イメージサイズ確認
docker images feed-bower-api

# 起動テスト
docker run -p 8080:8080 \
  -e DYNAMODB_ENDPOINT=http://host.docker.internal:8000 \
  feed-bower-api:latest
```

---

## フェーズ 3: フロントエンド実装（2 週間）

### タスク 3.1: Next.js プロジェクト初期化

**作業内容**:

- [ ] front/next.js プロジェクト作成
- [ ] **prototype/ から以下をコピー**:
  - src/app/globals.css
  - src/styles/colors.ts
  - src/types/index.ts
  - tailwind.config.js
  - tsconfig.json
- [ ] 必要なパッケージインストール

**確認事項**:

- [ ] Next.js が起動するか
- [ ] Tailwind CSS が動作するか
- [ ] TypeScript が正しく設定されているか

**テスト**:

```bash
cd front/next.js
npm install
npm run dev
```

**UI 確認**:

- [ ] http://localhost:3000 にアクセスできる
- [ ] Tailwind CSS のスタイルが適用されている

---

### タスク 3.2: 共通コンポーネント移行

**作業内容**:

- [ ] **prototype/ から以下をコピー**:
  - src/components/Layout.tsx
  - src/components/Sidebar.tsx
  - src/components/MobileHeader.tsx
  - src/components/Breadcrumb.tsx
  - src/components/ChickIcon.tsx
- [ ] API 連携部分を修正（localStorage → API）

**確認事項**:

- [ ] 全コンポーネントがエラーなくビルドできるか
- [ ] TypeScript エラーがないか

**テスト**:

```bash
npm run build
npm run lint
```

**UI 確認**:

- [ ] レイアウトが正しく表示される
- [ ] サイドバーが表示される（デスクトップ）
- [ ] モバイルヘッダーが表示される（モバイル）
- [ ] ひよこアイコンが右下に表示される

---

### タスク 3.3: Context・状態管理実装

**作業内容**:

- [ ] **prototype/src/contexts/AppContext.tsx をコピー**
- [ ] API クライアント作成（src/lib/api.ts）
- [ ] localStorage 管理を API 連携に変更

**確認事項**:

- [ ] Context が正しく動作するか
- [ ] API クライアントが正しく設定されているか

**テスト**:

```bash
npm test
```

---

### タスク 3.4: 認証機能実装

**作業内容**:

- [ ] **prototype/src/app/page.tsx（ランディング）をコピー**
- [ ] ゲストログイン API 連携
- [ ] JWT トークン管理（Cookie）
- [ ] 認証状態管理

**確認事項**:

- [ ] ゲストログインが成功するか
- [ ] トークンが Cookie に保存されるか
- [ ] 認証後にリダイレクトされるか

**テスト**:

```bash
npm test -- auth
```

**UI 確認**:

- [ ] ランディングページが表示される
- [ ] 「ゲストで試す」ボタンが動作する
- [ ] ログイン後、フィード画面に遷移する
- [ ] ログアウトボタンが動作する

---

### タスク 3.5: バウアー管理画面実装

**作業内容**:

- [ ] **prototype/ から以下をコピー**:
  - src/app/bowers/page.tsx
  - src/components/BowerCard.tsx
  - src/components/BowerCreator.tsx
  - src/hooks/useBowers.ts
- [ ] API 連携実装
  - バウアー一覧取得
  - バウアー作成
  - バウアー編集
  - バウアー削除

**確認事項**:

- [ ] バウアー一覧が表示されるか
- [ ] バウアー作成が成功するか
- [ ] バウアー編集が成功するか
- [ ] バウアー削除が成功するか

**テスト**:

```bash
npm test -- bowers
```

**UI 確認**:

- [ ] バウアー一覧が表示される
- [ ] 「バウアーを作成」ボタンが動作する
- [ ] キーワード入力画面が表示される
- [ ] ドラッグ&ドロップが動作する
- [ ] プレビューモーダルが表示される
- [ ] フィード選択ができる
- [ ] バウアーが作成される
- [ ] 編集モーダルが表示される
- [ ] 削除確認モーダルが表示される
- [ ] 検索機能が動作する

---

### タスク 3.6: フィード画面実装

**作業内容**:

- [ ] **prototype/ から以下をコピー**:
  - src/app/feeds/page.tsx
  - src/components/ArticleCard.tsx
- [ ] API 連携実装
  - 記事一覧取得（無限スクロール）
  - いいね機能
  - 既読機能
  - チェック機能

**確認事項**:

- [ ] 記事一覧が表示されるか
- [ ] 無限スクロールが動作するか
- [ ] いいねが動作するか
- [ ] 既読マークが動作するか
- [ ] 日付チェックが動作するか

**テスト**:

```bash
npm test -- feeds
```

**UI 確認**:

- [ ] 記事一覧が表示される（50 件）
- [ ] スクロールで追加読み込みされる
- [ ] ローディングアイコン（🐣）が表示される
- [ ] タブ切り替えが動作する（すべて/重要/お気に入り）
- [ ] バウアー切り替えプルダウンが動作する
- [ ] 検索機能が動作する
- [ ] 日付トグルが動作する
- [ ] チェックボタンが動作する
- [ ] 「全て開く/閉じる」ボタンが動作する
- [ ] いいねボタンが動作する
- [ ] 記事クリックで外部リンクが開く
- [ ] チェック済バッジが表示される
- [ ] ひよこがジャンプする（いいね・チェック時）

---

### タスク 3.7: お気に入り画面実装

**作業内容**:

- [ ] **prototype/src/app/liked/page.tsx をコピー**
- [ ] API 連携実装
  - いいね記事一覧取得

**確認事項**:

- [ ] いいね記事一覧が表示されるか
- [ ] いいね解除が動作するか

**テスト**:

```bash
npm test -- liked
```

**UI 確認**:

- [ ] いいね記事一覧が表示される
- [ ] いいね解除ボタンが動作する
- [ ] 記事がリストから削除される

---

### タスク 3.8: 多言語対応実装

**作業内容**:

- [ ] **prototype/src/lib/i18n.ts をコピー**
- [ ] 全画面で翻訳適用確認

**確認事項**:

- [ ] 言語切り替えが動作するか
- [ ] 全テキストが翻訳されているか

**テスト**:

```bash
npm test -- i18n
```

**UI 確認**:

- [ ] 言語切り替えボタンが動作する
- [ ] 日本語表示が正しい
- [ ] 英語表示が正しい
- [ ] 設定が保存される

---

## フェーズ 4: インフラ構築（1 週間）

### タスク 4.1: Terraform 初期化

**作業内容**:

- [ ] infra/terraform ディレクトリ作成
- [ ] modules/ ディレクトリ作成
- [ ] environments/ ディレクトリ作成（dev/staging/prod）
- [ ] backend.tf 作成（S3 バックエンド設定）

**確認事項**:

- [ ] Terraform が初期化できるか
- [ ] S3 バックエンドが設定されているか

**テスト**:

```bash
cd infra/terraform/environments/dev
terraform init
terraform validate
```

---

### タスク 4.2: DynamoDB モジュール作成

**作業内容**:

- [ ] modules/dynamodb/main.tf 作成
- [ ] 全テーブル定義
- [ ] GSI 設定
- [ ] variables.tf 作成
- [ ] outputs.tf 作成

**確認事項**:

- [ ] テーブル定義が設計書通りか
- [ ] GSI が正しく設定されているか

**テスト**:

```bash
terraform plan
```

---

### タスク 4.3: Lambda モジュール作成

**作業内容**:

- [ ] modules/lambda/main.tf 作成
- [ ] ECR リポジトリ定義
- [ ] Lambda 関数定義
- [ ] IAM ロール設定
- [ ] 環境変数設定

**確認事項**:

- [ ] Lambda 関数が定義されているか
- [ ] IAM ロールが適切か
- [ ] 環境変数が設定されているか

**テスト**:

```bash
terraform plan
```

---

### タスク 4.4: API Gateway モジュール作成

**作業内容**:

- [ ] modules/api-gateway/main.tf 作成
- [ ] REST API 定義
- [ ] Lambda 統合設定
- [ ] CORS 設定
- [ ] ステージ設定

**確認事項**:

- [ ] API Gateway が定義されているか
- [ ] Lambda 統合が正しいか
- [ ] CORS が設定されているか

**テスト**:

```bash
terraform plan
```

---

### タスク 4.5: Amplify Hosting モジュール作成

**作業内容**:

- [ ] modules/amplify/main.tf 作成
- [ ] Amplify アプリ定義
- [ ] GitHub 連携設定
- [ ] ビルド設定
- [ ] 環境変数設定

**確認事項**:

- [ ] Amplify アプリが定義されているか
- [ ] ビルド設定が正しいか

**テスト**:

```bash
terraform plan
```

---

### タスク 4.6: 開発環境デプロイ

**作業内容**:

- [ ] environments/dev/main.tf 作成
- [ ] 全モジュール統合
- [ ] terraform apply 実行

**確認事項**:

- [ ] 全リソースが作成されたか
- [ ] DynamoDB テーブルが作成されたか
- [ ] Lambda 関数が作成されたか
- [ ] API Gateway が作成されたか
- [ ] Amplify アプリが作成されたか

**テスト**:

```bash
cd infra/terraform/environments/dev
terraform apply

# リソース確認
aws dynamodb list-tables
aws lambda list-functions
aws apigateway get-rest-apis
aws amplify list-apps
```

---

## フェーズ 5: CI/CD 構築（1 週間）

### タスク 5.1: GitHub Actions - フロントエンド

**作業内容**:

- [ ] .github/workflows/deploy-frontend.yml 作成
- [ ] ビルド・テストジョブ設定
- [ ] Amplify デプロイジョブ設定

**確認事項**:

- [ ] ワークフローが正しく動作するか
- [ ] テストが実行されるか
- [ ] デプロイが成功するか

**テスト**:

```bash
# ローカルで act を使ってテスト
act push -j deploy
```

---

### タスク 5.2: GitHub Actions - バックエンド

**作業内容**:

- [ ] .github/workflows/deploy-backend.yml 作成
- [ ] ビルド・テストジョブ設定
- [ ] ECR プッシュジョブ設定
- [ ] Lambda 更新ジョブ設定

**確認事項**:

- [ ] ワークフローが正しく動作するか
- [ ] テストが実行されるか
- [ ] ECR にプッシュされるか
- [ ] Lambda が更新されるか

**テスト**:

```bash
# ローカルで act を使ってテスト
act push -j deploy
```

---

### タスク 5.3: GitHub Actions - PR チェック

**作業内容**:

- [ ] .github/workflows/pr-check.yml 作成
- [ ] Lint・テストジョブ設定

**確認事項**:

- [ ] PR 作成時に自動実行されるか
- [ ] Lint が実行されるか
- [ ] テストが実行されるか

**テスト**:

```bash
# テスト PR 作成して確認
```

---

### タスク 5.4: GitHub Secrets 設定

**作業内容**:

- [ ] AWS_ACCESS_KEY_ID 設定
- [ ] AWS_SECRET_ACCESS_KEY 設定
- [ ] AMPLIFY_APP_ID 設定
- [ ] API_URL 設定

**確認事項**:

- [ ] 全シークレットが設定されているか
- [ ] デプロイが成功するか

---

## フェーズ 6: 統合テスト・最適化（1 週間）

### タスク 6.1: E2E テスト実装

**作業内容**:

- [ ] Playwright セットアップ
- [ ] ログインフローテスト
- [ ] バウアー作成フローテスト
- [ ] 記事閲覧フローテスト
- [ ] いいね・チェックフローテスト

**確認事項**:

- [ ] 全 E2E テストが成功するか
- [ ] クリティカルパスがカバーされているか

**テスト**:

```bash
npx playwright test
```

**UI 確認**:

- [ ] テストが自動で画面操作している
- [ ] スクリーンショットが保存される
- [ ] エラーがない

---

### タスク 6.2: パフォーマンステスト

**作業内容**:

- [ ] Lighthouse テスト実行
- [ ] パフォーマンススコア確認
- [ ] 最適化実施

**確認事項**:

- [ ] Performance スコア > 90
- [ ] Accessibility スコア > 90
- [ ] Best Practices スコア > 90
- [ ] SEO スコア > 90

**テスト**:

```bash
npm run lighthouse
```

---

### タスク 6.3: セキュリティ監査

**作業内容**:

- [ ] npm audit 実行
- [ ] 脆弱性修正
- [ ] OWASP チェックリスト確認

**確認事項**:

- [ ] 脆弱性がないか
- [ ] XSS 対策が実装されているか
- [ ] CSRF 対策が実装されているか

**テスト**:

```bash
npm audit
npm audit fix
```

---

### タスク 6.4: ドキュメント整備

**作業内容**:

- [ ] README.md 更新
- [ ] API ドキュメント作成
- [ ] 環境構築手順書作成
- [ ] デプロイ手順書作成

**確認事項**:

- [ ] ドキュメントが最新か
- [ ] 手順通りに環境構築できるか

---

## フェーズ 7: 本番デプロイ（1 週間）

### タスク 7.1: 本番環境構築

**作業内容**:

- [ ] environments/prod/main.tf 作成
- [ ] 本番用設定（メモリ・タイムアウト等）
- [ ] terraform apply 実行

**確認事項**:

- [ ] 本番環境が作成されたか
- [ ] 設定が適切か

**テスト**:

```bash
cd infra/terraform/environments/prod
terraform plan
terraform apply
```

---

### タスク 7.2: カスタムドメイン設定

**作業内容**:

- [ ] Route 53 でドメイン設定
- [ ] Amplify にカスタムドメイン追加
- [ ] SSL 証明書設定

**確認事項**:

- [ ] カスタムドメインでアクセスできるか
- [ ] HTTPS が有効か

**UI 確認**:

- [ ] https://feed-bower.com にアクセスできる
- [ ] SSL 証明書が有効

---

### タスク 7.3: モニタリング設定

**作業内容**:

- [ ] CloudWatch ダッシュボード作成
- [ ] アラーム設定
- [ ] ログ保持期間設定

**確認事項**:

- [ ] ダッシュボードが表示されるか
- [ ] アラームが設定されているか

---

### タスク 7.4: 本番デプロイ

**作業内容**:

- [ ] main ブランチにマージ
- [ ] 自動デプロイ確認
- [ ] 動作確認

**確認事項**:

- [ ] デプロイが成功したか
- [ ] 全機能が動作するか

**UI 確認**:

- [ ] 本番環境で全機能を手動テスト
- [ ] ゲストログイン
- [ ] バウアー作成
- [ ] 記事閲覧
- [ ] いいね・チェック
- [ ] ひよこアニメーション
- [ ] 言語切り替え
- [ ] モバイル表示

---

## 完了条件

### 全体チェックリスト

**機能**:

- [ ] 全機能が動作する
- [ ] プロトタイプと同等の UX
- [ ] API 連携が正常

**テスト**:

- [ ] 単体テストカバレッジ > 80%
- [ ] E2E テスト全て成功
- [ ] パフォーマンステスト合格

**インフラ**:

- [ ] 全リソースがデプロイされている
- [ ] モニタリングが設定されている
- [ ] CI/CD が動作している

**ドキュメント**:

- [ ] README が最新
- [ ] API ドキュメントが完成
- [ ] 運用手順書が完成

---

## トラブルシューティング

### よくある問題

**問題**: DynamoDB Local に接続できない

```bash
# 解決策
docker-compose restart dynamodb-local
bash scripts/create-dynamodb-tables.sh
```

**問題**: Go のビルドエラー

```bash
# 解決策
go mod tidy
go clean -cache
```

**問題**: Next.js のビルドエラー

```bash
# 解決策
rm -rf .next node_modules
npm install
npm run build
```

**問題**: Terraform apply エラー

```bash
# 解決策
terraform init -upgrade
terraform plan
```

---

**作成者**: Kiro AI Assistant  
**最終更新**: 2024 年 10 月 9 日  
**バージョン**: 1.0
