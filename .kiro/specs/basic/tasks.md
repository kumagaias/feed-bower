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

- [x] タスク 1.1: リポジトリ・ディレクトリ構造のセットアップ
  - リポジトリ作成
  - ディレクトリ構造作成（back/go, front/next.js, infra/terraform）
  - .gitignore 設定
  - README.md 作成
  - ディレクトリ構造が設計書通りか確認
  - .gitignore に機密情報（.env, terraform.tfstate）が含まれているか
  - README に環境構築手順が記載されているか
  - テスト: `tree -L 2 -I 'node_modules|.git'`

---

### タスク 1.2: Dev Container セットアップ

- [x] タスク 1.2: Dev Container セットアップ
  - .devcontainer/devcontainer.json 作成
  - .devcontainer/docker-compose.yml 作成
  - Dockerfile.frontend 作成（Node.js 24）
  - Dockerfile.backend 作成（Go 1.23）
  - セットアップスクリプト作成
  - Dev Container が正常に起動するか
  - フロントエンド・バックエンド両方のコンテナが起動するか
  - DynamoDB Local が起動するか
  - DynamoDB Admin (http://localhost:8001) にアクセスできるか
  - テスト: `docker-compose ps` と `aws dynamodb list-tables --endpoint-url http://localhost:8000`

---

### タスク 1.3: DynamoDB Local テーブル作成

- [ ] タスク 1.3: DynamoDB Local テーブル作成
  - scripts/create-dynamodb-tables.sh 作成
  - Users テーブル作成スクリプト
  - Bowers テーブル作成スクリプト
  - Feeds テーブル作成スクリプト
  - Articles テーブル作成スクリプト
  - LikedArticles テーブル作成スクリプト
  - ChickStats テーブル作成スクリプト
  - 全テーブルが作成されているか
  - GSI（Global Secondary Index）が正しく設定されているか
  - DynamoDB Admin でテーブル構造を確認
  - テスト: `bash scripts/create-dynamodb-tables.sh` と `aws dynamodb list-tables --endpoint-url http://localhost:8000`

---

## フェーズ 2: バックエンド実装（2 週間）

### タスク 2.1: Go プロジェクト初期化

- [ ] タスク 2.1: Go プロジェクト初期化
  - back/go/go.mod 初期化
  - 必要なパッケージのインストール（AWS SDK for Go v2、Lambda runtime、UUID 生成、JWT 認証）
  - ディレクトリ構造作成（cmd, internal, pkg）
  - go.mod が正しく作成されているか
  - 依存関係が解決されているか
  - テスト: `go mod init` → `go mod tidy` → `go build ./...`

---

### タスク 2.2: データモデル実装

- [ ] タスク 2.2: データモデル実装
  - internal/model/user.go 作成
  - internal/model/bower.go 作成
  - internal/model/feed.go 作成
  - internal/model/article.go 作成
  - internal/model/chick.go 作成
  - バリデーションタグ追加
  - 全モデルが設計書通りの構造か
  - JSON タグが正しく設定されているか
  - バリデーションタグが適切か
  - テスト: `go test ./internal/model/...`

---

### タスク 2.3: Repository 層実装

- [ ] タスク 2.3: Repository 層実装
  - pkg/dynamodb/client.go 作成（DynamoDB クライアント）
  - internal/repository/user_repository.go 実装
  - internal/repository/bower_repository.go 実装
  - internal/repository/feed_repository.go 実装
  - internal/repository/article_repository.go 実装
  - internal/repository/chick_repository.go 実装
  - CRUD 操作が全て実装されているか
  - エラーハンドリングが適切か
  - DynamoDB Local で動作確認
  - テスト: `go test ./internal/repository/... -v`

---

### タスク 2.4: Service 層実装

- [ ] タスク 2.4: Service 層実装
  - internal/service/auth_service.go 実装（ゲストログイン、JWT トークン生成）
  - internal/service/bower_service.go 実装（バウアー作成・更新・削除、バウアー一覧取得）
  - internal/service/feed_service.go 実装（フィード追加・削除、フィードプレビュー）
  - internal/service/article_service.go 実装（記事一覧取得、いいね・既読管理）
  - internal/service/chick_service.go 実装（ステータス更新、経験値計算）
  - internal/service/rss_service.go 実装（RSS フィード取得、XML パース）
  - ビジネスロジックが正しく実装されているか
  - トランザクション処理が適切か
  - エラーハンドリングが適切か
  - テスト: `go test ./internal/service/... -v -cover`

---

### タスク 2.5: Handler 層実装

- [ ] タスク 2.5: Handler 層実装
  - internal/handler/auth_handler.go 実装
  - internal/handler/bower_handler.go 実装
  - internal/handler/feed_handler.go 実装
  - internal/handler/article_handler.go 実装
  - internal/handler/chick_handler.go 実装
  - internal/middleware/auth.go 実装（JWT 検証）
  - internal/middleware/cors.go 実装
  - internal/middleware/logger.go 実装
  - リクエスト/レスポンスの形式が正しいか
  - バリデーションが適切か
  - ミドルウェアが正しく動作するか
  - テスト: `go test ./internal/handler/... -v` と `go test ./internal/middleware/... -v`

---

### タスク 2.6: Lambda エントリーポイント実装

- [ ] タスク 2.6: Lambda エントリーポイント実装
  - cmd/lambda/main.go 作成
  - ルーティング設定
  - Lambda ハンドラー実装
  - 環境変数読み込み
  - ローカルで起動できるか
  - 全エンドポイントにアクセスできるか
  - 環境変数が正しく読み込まれるか
  - テスト: `go run cmd/lambda/main.go` → `curl http://localhost:8080/health`

---

### タスク 2.7: Dockerfile 作成

- [ ] タスク 2.7: Dockerfile 作成
  - back/go/Dockerfile 作成
  - マルチステージビルド設定
  - 最小イメージサイズ最適化
  - Docker イメージがビルドできるか
  - イメージサイズが適切か（< 100MB）
  - コンテナが正常に起動するか
  - テスト: `docker build -t feed-bower-api:latest .` → `docker run -p 8080:8080 feed-bower-api:latest`

---

## フェーズ 3: フロントエンド実装（2 週間）

### タスク 3.1: Next.js プロジェクト初期化

- [ ] タスク 3.1: Next.js プロジェクト初期化
  - front/next.js プロジェクト作成
  - prototype/ から設定ファイルをコピー（globals.css、colors.ts、types/index.ts、tailwind.config.js、tsconfig.json）
  - 必要なパッケージインストール
  - Next.js が起動するか
  - Tailwind CSS が動作するか
  - TypeScript が正しく設定されているか
  - http://localhost:3000 にアクセスできる
  - Tailwind CSS のスタイルが適用されている
  - テスト: `npm install` → `npm run dev`

---

### タスク 3.2: 共通コンポーネント移行

- [ ] タスク 3.2: 共通コンポーネント移行
  - prototype/ から共通コンポーネントをコピー（Layout.tsx、Sidebar.tsx、MobileHeader.tsx、Breadcrumb.tsx、ChickIcon.tsx）
  - API 連携部分を修正（localStorage → API）
  - 全コンポーネントがエラーなくビルドできるか
  - TypeScript エラーがないか
  - レイアウトが正しく表示される
  - サイドバーが表示される（デスクトップ）
  - モバイルヘッダーが表示される（モバイル）
  - ひよこアイコンが右下に表示される
  - テスト: `npm run build` → `npm run lint`

---

### タスク 3.3: バウアー管理機能の統合

- [ ] タスク 3.3: バウアー管理機能の統合
  - `src/app/bowers/page.tsx` を API 連携に変更
  - バウアー一覧取得 API 呼び出し
  - バウアー作成 API 呼び出し
  - バウアー編集 API 呼び出し
  - バウアー削除 API 呼び出し
  - ローディング状態の実装
  - エラーハンドリング
  - バウアーの作成・編集・削除が正常に動作する
  - ローディング表示が正しく表示される
  - エラーメッセージが適切に表示される
  - バウアー管理の E2E テストがパス
  - コンソールエラーがない
  - バウアー一覧ページでバウアーが表示される
  - 「バウアーを作成」ボタンをクリックして作成フローを完了
  - 作成したバウアーが一覧に表示される
  - バウアーの編集ボタンをクリックして編集できる
  - バウアーの削除ボタンをクリックして削除確認モーダルが表示される
  - 削除後、一覧から消える
  - ローディング中は 🐣 アイコンが表示される
  - エラー時は赤文字でメッセージが表示される
  - テスト: `npm run test:e2e -- tests/bowers.spec.ts` と `npm test -- src/app/bowers`

---

### タスク 3.4: フィード管理機能の統合

- [ ] タスク 3.4: フィード管理機能の統合
  - バウアー編集画面のフィード管理を API 連携
  - フィード追加 API 呼び出し
  - フィード削除 API 呼び出し
  - フィードプレビュー API 呼び出し
  - URL 検証の実装
  - フィードの追加・削除が正常に動作する
  - フィードプレビューが表示される
  - URL 検証が正しく機能する
  - フィード管理の E2E テストがパス
  - コンソールエラーがない
  - バウアー編集画面でフィード URL を入力
  - 無効な URL を入力するとエラーメッセージが表示される
  - 有効な URL を入力して追加ボタンをクリック
  - フィードが一覧に追加される
  - プレビューボタンをクリックしてモーダルが表示される
  - フィード削除ボタンをクリックして削除される
  - 最後の 1 つのフィードは削除ボタンが非表示
  - テスト: `npm run test:e2e -- tests/feeds.spec.ts` と `npm test -- src/lib/validation.test.ts`

---

### タスク 3.5: 記事表示機能の統合

- [ ] タスク 3.5: 記事表示機能の統合
  - `src/app/feeds/page.tsx` を API 連携に変更
  - 記事一覧取得 API 呼び出し
  - 無限スクロール実装
  - いいね機能 API 連携
  - チェック機能 API 連携
  - 検索機能実装
  - 記事一覧が正しく表示される
  - 無限スクロールが正常に動作する
  - いいね・チェックが正常に動作する
  - 検索が正常に動作する
  - 記事表示の E2E テストがパス
  - コンソールエラーがない
  - フィード画面で記事が 50 件表示される
  - スクロールすると 🐣 アイコンが表示され、次の 50 件が読み込まれる
  - 記事のいいねボタンをクリックしてハートが赤くなる
  - 日付のチェックボタンをクリックして色が変わる
  - チェック済の記事が透明度 70%になる
  - 検索バーにキーワードを入力して記事が絞り込まれる
  - 「全て開く/閉じる」ボタンで日付トグルが一括操作される
  - 記事をクリックして外部リンクが新規タブで開く
  - テスト: `npm run test:e2e -- tests/articles.spec.ts` と `npm test -- src/app/feeds/page.test.tsx`

---

### タスク 3.6: ひよこ育成機能の統合

- [ ] タスク 3.6: ひよこ育成機能の統合
  - `src/components/ChickIcon.tsx` を API 連携に変更
  - ステータス取得 API 呼び出し
  - ステータス更新 API 呼び出し
  - いいね記事一覧取得 API 呼び出し
  - アニメーション連携
  - ひよこステータスが正しく表示される
  - いいね・チェック時にステータスが更新される
  - アニメーションが正常に動作する
  - ひよこ機能の E2E テストがパス
  - コンソールエラーがない
  - 右下のひよこアイコンをクリックしてモーダルが開く
  - ステータスタブで総いいね数・チェック日数・経験値が表示される
  - お気に入りタブでいいねした記事一覧が表示される
  - 記事をいいねするとひよこがジャンプする
  - 日付をチェックするとひよこがジャンプする
  - レベルアップ時にひよこが回転＆拡大し、トーストが表示される
  - レベルに応じてひよこの絵文字が変わる（🐣→🐤→🐥→🐦）
  - テスト: `npm run test:e2e -- tests/chick.spec.ts` と `npm test -- src/components/ChickIcon.test.tsx`

---

## フェーズ 4: RSS 機能実装（2 週間）

### タスク 4.1: RSS パーサー実装

- [ ] タスク 4.1: RSS パーサー実装
  - `internal/service/rss_service.go` 実装
  - RSS 2.0 パーサー
  - Atom Feed パーサー
  - 画像 URL 抽出
  - エラーハンドリング
  - RSS/Atom フィードが正しくパースされる
  - 画像 URL が正しく抽出される
  - 不正なフィードでもエラーにならない
  - RSS パーサーのテストが全てパス
  - パニックが発生しない
  - テスト: `go test ./internal/service/rss_service_test.go -v` と `go test ./internal/service/rss_service_test.go -v -run TestRealFeed`

---

### タスク 4.2: フィード取得スケジューラー

- [ ] タスク 4.2: フィード取得スケジューラー
  - EventBridge ルール作成（Terraform）
  - Lambda 関数にスケジュール実行を追加
  - 全フィードの記事を取得
  - 重複チェック
  - DynamoDB に保存
  - EventBridge ルールが正しく設定される
  - 定期実行が正常に動作する
  - 記事が重複せずに保存される
  - スケジューラーのテストがパス
  - タイムアウトエラーがない
  - DynamoDB Admin で記事が保存されている
  - フィード画面で実際の記事が表示される
  - テスト: `go run cmd/lambda/main.go --mode=scheduler` と `aws dynamodb scan --table-name Articles --endpoint-url http://localhost:8000`

---

## フェーズ 5: インフラ構築（1 週間）

### タスク 5.1: Terraform モジュール作成

- [ ] タスク 5.1: Terraform モジュール作成
  - `infra/terraform/modules/lambda/` 作成
  - `infra/terraform/modules/dynamodb/` 作成
  - `infra/terraform/modules/api-gateway/` 作成
  - `infra/terraform/modules/ecr/` 作成
  - `infra/terraform/modules/amplify/` 作成
  - Terraform の構文が正しい
  - モジュールが再利用可能
  - `terraform validate` がパスする
  - テスト: `terraform fmt -check` → `terraform validate` → `terraform plan`

---

### タスク 5.2: 開発環境デプロイ

- [ ] タスク 5.2: 開発環境デプロイ
  - `infra/terraform/environments/dev/` 設定
  - DynamoDB テーブル作成
  - Lambda 関数デプロイ
  - API Gateway デプロイ
  - Amplify Hosting セットアップ
  - `terraform apply` が成功する
  - 全てのリソースが作成される
  - API Gateway のエンドポイントが取得できる
  - Amplify アプリが作成される
  - Terraform エラーがない
  - AWS コンソールでリソースが作成されている
  - API Gateway の URL にアクセスできる
  - Amplify コンソールでアプリが表示される
  - テスト: `terraform init` → `terraform plan` → `terraform apply` → `terraform output`

---

### タスク 5.3: 本番環境デプロイ

- [ ] タスク 5.3: 本番環境デプロイ
  - `infra/terraform/environments/prod/` 設定
  - 本番用の設定値を調整（Lambda メモリ: 2048MB、DynamoDB: プロビジョンド課金、CloudWatch: 30 日間保持）
  - 本番環境デプロイ
  - `terraform apply` が成功する
  - 本番用の設定が適用される
  - カスタムドメインが設定される
  - SSL 証明書が有効
  - Terraform エラーがない
  - 本番 URL にアクセスできる
  - HTTPS で接続できる
  - カスタムドメインが機能している
  - テスト: `terraform plan` → `terraform apply` → `curl https://api.feed-bower.com/health`

---

## フェーズ 6: テスト・最適化（1 週間）

### タスク 6.1: E2E テスト実装

- [ ] タスク 6.1: E2E テスト実装
  - Playwright セットアップ
  - 認証フローの E2E テスト
  - バウアー管理の E2E テスト
  - フィード管理の E2E テスト
  - 記事表示の E2E テスト
  - ひよこ機能の E2E テスト
  - 全ての E2E テストがパスする
  - テストカバレッジが 80%以上
  - CI/CD で E2E テストが実行される
  - テスト実行時にエラーがない
  - Playwright のレポートで全テストがパスしている
  - テスト: `npm run test:e2e` → `npm run test:e2e:ci` → `npm run test:coverage`

---

### タスク 6.2: パフォーマンス最適化

- [ ] タスク 6.2: パフォーマンス最適化
  - Next.js Image コンポーネント使用
  - コード分割（dynamic import）
  - SWR でキャッシング実装
  - Lambda コールドスタート対策
  - DynamoDB クエリ最適化
  - Lighthouse スコアが 90 以上
  - 初回ロードが 3 秒以内
  - Lambda 実行時間が 3 秒以内
  - パフォーマンス警告がない
  - ページ遷移が高速
  - 画像の遅延読み込みが機能している
  - スクロールがスムーズ
  - テスト: `npm run lighthouse` → `npm run analyze` → `aws lambda get-function --function-name feed-bower-api`

---

### タスク 6.3: セキュリティ監査

- [ ] タスク 6.3: セキュリティ監査
  - 依存関係の脆弱性スキャン
  - XSS 対策確認
  - CSRF 対策確認
  - 入力検証の確認
  - IAM ロールの最小権限確認
  - `npm audit` で脆弱性がない
  - `go mod verify` がパスする
  - XSS 対策が実装されている
  - CSRF 対策が実装されている
  - セキュリティ警告がない
  - XSS 攻撃が防げている（<script>タグが無効化される）
  - CSRF トークンが機能している
  - テスト: `npm audit` → `npm audit fix` → `go list -json -m all | nancy sleuth` → `aws iam get-role-policy --role-name feed-bower-lambda-role --policy-name lambda-policy`

---

## フェーズ 7: ドキュメント整備（3 日）

### タスク 7.1: README 作成

- [ ] タスク 7.1: README 作成
  - ルート README.md 作成
  - front/next.js/README.md 作成
  - back/go/README.md 作成
  - infra/terraform/README.md 作成
  - セットアップ手順
  - 開発手順
  - デプロイ手順
  - README の内容が正確
  - セットアップ手順が実行できる
  - 全ての README が作成されている
  - テスト: READMEの手順を実際に実行して確認（新しい環境で手順通りにセットアップできるか確認）

---

### タスク 7.2: API ドキュメント作成

- [ ] タスク 7.2: API ドキュメント作成
  - OpenAPI 3.0 仕様書作成
  - 全エンドポイントの定義
  - リクエスト/レスポンス例
  - エラーコード一覧
  - Swagger UI セットアップ
  - OpenAPI 仕様が正しい
  - Swagger UI で表示できる
  - 全エンドポイントが文書化されている
  - Swagger UI で API ドキュメントが表示される
  - Try it out で実際に API を呼び出せる
  - テスト: `npx @redocly/cli lint openapi.yaml` → `docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml -v $(pwd):/openapi swaggerapi/swagger-ui`

---

## フェーズ 8: 本番リリース（1 日）

### タスク 8.1: 本番デプロイ

- [ ] タスク 8.1: 本番デプロイ
  - main ブランチにマージ
  - GitHub Actions で自動デプロイ
  - デプロイ完了確認
  - 動作確認
  - GitHub Actions が成功する
  - フロントエンドが Amplify にデプロイされる
  - バックエンドが Lambda にデプロイされる
  - 全機能が正常に動作する
  - デプロイエラーがない
  - https://feed-bower.com にアクセスできる
  - ゲストログインが動作する
  - バウアー作成が動作する
  - フィード追加が動作する
  - 記事一覧が表示される
  - いいね・チェックが動作する
  - ひよこアニメーションが動作する
  - 全ての画面でエラーがない
  - モバイル表示が正常
  - 日本語/英語切り替えが動作する
  - テスト: `gh run list` → `curl https://api.feed-bower.com/health` → `curl -X POST https://api.feed-bower.com/api/auth/guest`

---

### タスク 8.2: モニタリング設定

- [ ] タスク 8.2: モニタリング設定
  - CloudWatch ダッシュボード作成
  - アラーム設定（Lambda エラー率 > 5%、API Gateway 5xx > 10 件/分、DynamoDB スロットリング）
  - ログ保持期間設定
  - SNS 通知設定
  - ダッシュボードが表示される
  - アラームが正しく設定される
  - テストアラートが通知される
  - 設定エラーがない
  - CloudWatch ダッシュボードでメトリクスが表示される
  - アラーム通知がメールで届く
  - テスト: `aws cloudwatch set-alarm-state --alarm-name feed-bower-lambda-errors --state-value ALARM --state-reason "Testing alarm"` → `aws logs tail /aws/lambda/feed-bower-api --follow`

---

## 完了チェックリスト

### 全体確認

- [ ] 全体確認
  - 全てのタスクが完了している
  - 全てのテストがパスしている
  - ドキュメントが整備されている
  - 本番環境が正常に動作している

### 品質確認

- [ ] 品質確認
  - コードカバレッジ 80%以上
  - Lighthouse スコア 90 以上
  - セキュリティ脆弱性なし
  - パフォーマンス要件を満たしている

### デプロイ確認

- [ ] デプロイ確認
  - CI/CD パイプラインが動作している
  - ロールバック手順が確認されている
  - モニタリングが設定されている
  - アラートが機能している

---

**テスト内容**:

- モデルの JSON 変換テスト
- バリデーションテスト

---

### タスク 2.3: Repository 層実装

- [ ] タスク 2.3: Repository 層実装
  - pkg/dynamodb/client.go 作成（DynamoDB クライアント）
  - internal/repository/user_repository.go 実装
  - internal/repository/bower_repository.go 実装
  - internal/repository/feed_repository.go 実装
  - internal/repository/article_repository.go 実装
  - internal/repository/chick_repository.go 実装
  - CRUD 操作が全て実装されているか
  - エラーハンドリングが適切か
  - DynamoDB Local で動作確認
  - Create/Read/Update/Delete の各操作
  - GSI を使った検索
  - エラーケース（存在しない ID 等）
  - テスト: `go test ./internal/repository/... -v`

---

### タスク 2.4: Service 層実装

- [ ] タスク 2.4: Service 層実装
  - internal/service/auth_service.go 実装（ゲストログイン、JWT トークン生成）
  - internal/service/bower_service.go 実装（バウアー作成・更新・削除、バウアー一覧取得）
  - internal/service/feed_service.go 実装（フィード追加・削除、フィードプレビュー）
  - internal/service/article_service.go 実装（記事一覧取得、いいね・既読管理）
  - internal/service/chick_service.go 実装（ステータス更新、経験値計算）
  - internal/service/rss_service.go 実装（RSS フィード取得、XML パース）
  - ビジネスロジックが正しく実装されているか
  - トランザクション処理が適切か
  - エラーハンドリングが適切か
  - 各サービスの主要機能
  - エッジケース
  - エラーハンドリング
  - カバレッジ 80% 以上
  - テスト: `go test ./internal/service/... -v -cover`

---

### タスク 2.5: Handler 層実装

- [ ] タスク 2.5: Handler 層実装
  - internal/handler/auth_handler.go 実装
  - internal/handler/bower_handler.go 実装
  - internal/handler/feed_handler.go 実装
  - internal/handler/article_handler.go 実装
  - internal/handler/chick_handler.go 実装
  - internal/middleware/auth.go 実装（JWT 検証）
  - internal/middleware/cors.go 実装
  - internal/middleware/logger.go 実装
  - リクエスト/レスポンスの形式が正しいか
  - バリデーションが適切か
  - ミドルウェアが正しく動作するか
  - 各エンドポイントのレスポンス
  - バリデーションエラー
  - 認証エラー
  - テスト: `go test ./internal/handler/... -v` と `go test ./internal/middleware/... -v`

---

### タスク 2.6: Lambda エントリーポイント実装

- [ ] タスク 2.6: Lambda エントリーポイント実装
  - cmd/lambda/main.go 作成
  - ルーティング設定
  - Lambda ハンドラー実装
  - 環境変数読み込み
  - ローカルで起動できるか
  - 全エンドポイントにアクセスできるか
  - 環境変数が正しく読み込まれるか
  - テスト: `go run cmd/lambda/main.go` → `curl http://localhost:8080/health` → `curl -X POST http://localhost:8080/api/auth/guest`

---

### タスク 2.7: Dockerfile 作成

- [ ] タスク 2.7: Dockerfile 作成
  - back/go/Dockerfile 作成
  - マルチステージビルド設定
  - 最小イメージサイズ最適化
  - Docker イメージがビルドできるか
  - イメージサイズが適切か（< 100MB）
  - コンテナが正常に起動するか
  - テスト: `docker build -t feed-bower-api:latest .` → `docker images feed-bower-api` → `docker run -p 8080:8080 -e DYNAMODB_ENDPOINT=http://host.docker.internal:8000 feed-bower-api:latest`

---

## フェーズ 3: フロントエンド実装（2 週間）

### タスク 3.1: Next.js プロジェクト初期化

- [ ] タスク 3.1: Next.js プロジェクト初期化
  - front/next.js プロジェクト作成
  - prototype/ から設定ファイルをコピー（globals.css、colors.ts、types/index.ts、tailwind.config.js、tsconfig.json）
  - 必要なパッケージインストール
  - Next.js が起動するか
  - Tailwind CSS が動作するか
  - TypeScript が正しく設定されているか
  - http://localhost:3000 にアクセスできる
  - Tailwind CSS のスタイルが適用されている
  - テスト: `npm install` → `npm run dev`

---

### タスク 3.2: 共通コンポーネント移行

- [ ] タスク 3.2: 共通コンポーネント移行
  - prototype/ から共通コンポーネントをコピー（Layout.tsx、Sidebar.tsx、MobileHeader.tsx、Breadcrumb.tsx、ChickIcon.tsx）
  - API 連携部分を修正（localStorage → API）
  - 全コンポーネントがエラーなくビルドできるか
  - TypeScript エラーがないか
  - レイアウトが正しく表示される
  - サイドバーが表示される（デスクトップ）
  - モバイルヘッダーが表示される（モバイル）
  - ひよこアイコンが右下に表示される
  - テスト: `npm run build` → `npm run lint`

---

### タスク 3.3: Context・状態管理実装

- [ ] タスク 3.3: Context・状態管理実装
  - prototype/src/contexts/AppContext.tsx をコピー
  - API クライアント作成（src/lib/api.ts）
  - localStorage 管理を API 連携に変更
  - Context が正しく動作するか
  - API クライアントが正しく設定されているか
  - テスト: `npm test`

---

### タスク 3.4: 認証機能実装

- [ ] タスク 3.4: 認証機能実装
  - prototype/src/app/page.tsx（ランディング）をコピー
  - ゲストログイン API 連携
  - JWT トークン管理（Cookie）
  - 認証状態管理
  - ゲストログインが成功するか
  - トークンが Cookie に保存されるか
  - 認証後にリダイレクトされるか
  - ランディングページが表示される
  - 「ゲストで試す」ボタンが動作する
  - ログイン後、フィード画面に遷移する
  - ログアウトボタンが動作する
  - テスト: `npm test -- auth`

---

### タスク 3.5: バウアー管理画面実装

- [ ] タスク 3.5: バウアー管理画面実装
  - prototype/ からコンポーネントをコピー（bowers/page.tsx、BowerCard.tsx、BowerCreator.tsx、useBowers.ts）
  - API 連携実装（バウアー一覧取得、バウアー作成、バウアー編集、バウアー削除）
  - バウアー一覧が表示されるか
  - バウアー作成が成功するか
  - バウアー編集が成功するか
  - バウアー削除が成功するか
  - バウアー一覧が表示される
  - 「バウアーを作成」ボタンが動作する
  - キーワード入力画面が表示される
  - ドラッグ&ドロップが動作する
  - プレビューモーダルが表示される
  - フィード選択ができる
  - バウアーが作成される
  - 編集モーダルが表示される
  - 削除確認モーダルが表示される
  - 検索機能が動作する
  - テスト: `npm test -- bowers`

---

### タスク 3.6: フィード画面実装

- [ ] タスク 3.6: フィード画面実装
  - prototype/ からコンポーネントをコピー（feeds/page.tsx、ArticleCard.tsx）
  - API 連携実装（記事一覧取得（無限スクロール）、いいね機能、既読機能、チェック機能）
  - 記事一覧が表示されるか
  - 無限スクロールが動作するか
  - いいねが動作するか
  - 既読マークが動作するか
  - 日付チェックが動作するか
  - 記事一覧が表示される（50 件）
  - スクロールで追加読み込みされる
  - ローディングアイコン（🐣）が表示される
  - タブ切り替えが動作する（すべて/重要/お気に入り）
  - バウアー切り替えプルダウンが動作する
  - 検索機能が動作する
  - 日付トグルが動作する
  - チェックボタンが動作する
  - 「全て開く/閉じる」ボタンが動作する
  - いいねボタンが動作する
  - 記事クリックで外部リンクが開く
  - チェック済バッジが表示される
  - ひよこがジャンプする（いいね・チェック時）
  - テスト: `npm test -- feeds`

---

### タスク 3.7: お気に入り画面実装

- [ ] タスク 3.7: お気に入り画面実装
  - prototype/src/app/liked/page.tsx をコピー
  - API 連携実装（いいね記事一覧取得）
  - いいね記事一覧が表示されるか
  - いいね解除が動作するか
  - いいね記事一覧が表示される
  - いいね解除ボタンが動作する
  - 記事がリストから削除される
  - テスト: `npm test -- liked`

---

### タスク 3.8: 多言語対応実装

- [ ] タスク 3.8: 多言語対応実装
  - prototype/src/lib/i18n.ts をコピー
  - 全画面で翻訳適用確認
  - 言語切り替えが動作するか
  - 全テキストが翻訳されているか
  - 言語切り替えボタンが動作する
  - 日本語表示が正しい
  - 英語表示が正しい
  - 設定が保存される
  - テスト: `npm test -- i18n`

---

## フェーズ 4: インフラ構築（1 週間）

### タスク 4.1: Terraform 初期化

- [ ] タスク 4.1: Terraform 初期化
  - infra/terraform ディレクトリ作成
  - modules/ ディレクトリ作成
  - environments/ ディレクトリ作成（dev/staging/prod）
  - backend.tf 作成（S3 バックエンド設定）
  - Terraform が初期化できるか
  - S3 バックエンドが設定されているか
  - テスト: `terraform init` → `terraform validate`

---

### タスク 4.2: DynamoDB モジュール作成

- [ ] タスク 4.2: DynamoDB モジュール作成
  - modules/dynamodb/main.tf 作成
  - 全テーブル定義
  - GSI 設定
  - variables.tf 作成
  - outputs.tf 作成
  - テーブル定義が設計書通りか
  - GSI が正しく設定されているか
  - テスト: `terraform plan`

---

### タスク 4.3: Lambda モジュール作成

- [ ] タスク 4.3: Lambda モジュール作成
  - modules/lambda/main.tf 作成
  - ECR リポジトリ定義
  - Lambda 関数定義
  - IAM ロール設定
  - 環境変数設定
  - Lambda 関数が定義されているか
  - IAM ロールが適切か
  - 環境変数が設定されているか
  - テスト: `terraform plan`

---

### タスク 4.4: API Gateway モジュール作成

- [ ] タスク 4.4: API Gateway モジュール作成
  - modules/api-gateway/main.tf 作成
  - REST API 定義
  - Lambda 統合設定
  - CORS 設定
  - ステージ設定
  - API Gateway が定義されているか
  - Lambda 統合が正しいか
  - CORS が設定されているか
  - テスト: `terraform plan`

---

### タスク 4.5: Amplify Hosting モジュール作成

- [ ] タスク 4.5: Amplify Hosting モジュール作成
  - modules/amplify/main.tf 作成
  - Amplify アプリ定義
  - GitHub 連携設定
  - ビルド設定
  - 環境変数設定
  - Amplify アプリが定義されているか
  - ビルド設定が正しいか
  - テスト: `terraform plan`

---

### タスク 4.6: 開発環境デプロイ

- [ ] タスク 4.6: 開発環境デプロイ
  - environments/dev/main.tf 作成
  - 全モジュール統合
  - terraform apply 実行
  - 全リソースが作成されたか
  - DynamoDB テーブルが作成されたか
  - Lambda 関数が作成されたか
  - API Gateway が作成されたか
  - Amplify アプリが作成されたか
  - テスト: `terraform apply` → `aws dynamodb list-tables` → `aws lambda list-functions` → `aws apigateway get-rest-apis` → `aws amplify list-apps`

---

## フェーズ 5: CI/CD 構築（1 週間）

### タスク 5.1: GitHub Actions - フロントエンド

- [ ] タスク 5.1: GitHub Actions - フロントエンド
  - .github/workflows/deploy-frontend.yml 作成
  - ビルド・テストジョブ設定
  - Amplify デプロイジョブ設定
  - ワークフローが正しく動作するか
  - テストが実行されるか
  - デプロイが成功するか
  - テスト: `act push -j deploy`

---

### タスク 5.2: GitHub Actions - バックエンド

- [ ] タスク 5.2: GitHub Actions - バックエンド
  - .github/workflows/deploy-backend.yml 作成
  - ビルド・テストジョブ設定
  - ECR プッシュジョブ設定
  - Lambda 更新ジョブ設定
  - ワークフローが正しく動作するか
  - テストが実行されるか
  - ECR にプッシュされるか
  - Lambda が更新されるか
  - テスト: `act push -j deploy`

---

### タスク 5.3: GitHub Actions - PR チェック

- [ ] タスク 5.3: GitHub Actions - PR チェック
  - .github/workflows/pr-check.yml 作成
  - Lint・テストジョブ設定
  - PR 作成時に自動実行されるか
  - Lint が実行されるか
  - テストが実行されるか
  - テスト: テスト PR 作成して確認

---

### タスク 5.4: GitHub Secrets 設定

- [ ] タスク 5.4: GitHub Secrets 設定
  - AWS_ACCESS_KEY_ID 設定
  - AWS_SECRET_ACCESS_KEY 設定
  - AMPLIFY_APP_ID 設定
  - API_URL 設定
  - 全シークレットが設定されているか
  - デプロイが成功するか

---

## フェーズ 6: 統合テスト・最適化（1 週間）

### タスク 6.1: E2E テスト実装

- [ ] タスク 6.1: E2E テスト実装
  - Playwright セットアップ
  - ログインフローテスト
  - バウアー作成フローテスト
  - 記事閲覧フローテスト
  - いいね・チェックフローテスト
  - 全 E2E テストが成功するか
  - クリティカルパスがカバーされているか
  - テストが自動で画面操作している
  - スクリーンショットが保存される
  - エラーがない
  - テスト: `npx playwright test`

---

### タスク 6.2: パフォーマンステスト

- [ ] タスク 6.2: パフォーマンステスト
  - Lighthouse テスト実行
  - パフォーマンススコア確認
  - 最適化実施
  - Performance スコア > 90
  - Accessibility スコア > 90
  - Best Practices スコア > 90
  - SEO スコア > 90
  - テスト: `npm run lighthouse`

---

### タスク 6.3: セキュリティ監査

- [ ] タスク 6.3: セキュリティ監査
  - npm audit 実行
  - 脆弱性修正
  - OWASP チェックリスト確認
  - 脆弱性がないか
  - XSS 対策が実装されているか
  - CSRF 対策が実装されているか
  - テスト: `npm audit` → `npm audit fix`

---

### タスク 6.4: ドキュメント整備

- [ ] タスク 6.4: ドキュメント整備
  - README.md 更新
  - API ドキュメント作成
  - 環境構築手順書作成
  - デプロイ手順書作成
  - ドキュメントが最新か
  - 手順通りに環境構築できるか

---

## フェーズ 7: 本番デプロイ（1 週間）

### タスク 7.1: 本番環境構築

- [ ] タスク 7.1: 本番環境構築
  - environments/prod/main.tf 作成
  - 本番用設定（メモリ・タイムアウト等）
  - terraform apply 実行
  - 本番環境が作成されたか
  - 設定が適切か
  - テスト: `terraform plan` → `terraform apply`

---

### タスク 7.2: カスタムドメイン設定

- [ ] タスク 7.2: カスタムドメイン設定
  - Route 53 でドメイン設定
  - Amplify にカスタムドメイン追加
  - SSL 証明書設定
  - カスタムドメインでアクセスできるか
  - HTTPS が有効か
  - https://feed-bower.com にアクセスできる
  - SSL 証明書が有効

---

### タスク 7.3: モニタリング設定

- [ ] タスク 7.3: モニタリング設定
  - CloudWatch ダッシュボード作成
  - アラーム設定
  - ログ保持期間設定
  - ダッシュボードが表示されるか
  - アラームが設定されているか

---

### タスク 7.4: 本番デプロイ

- [ ] タスク 7.4: 本番デプロイ
  - main ブランチにマージ
  - 自動デプロイ確認
  - 動作確認
  - デプロイが成功したか
  - 全機能が動作するか
  - 本番環境で全機能を手動テスト
  - ゲストログイン
  - バウアー作成
  - 記事閲覧
  - いいね・チェック
  - ひよこアニメーション
  - 言語切り替え
  - モバイル表示

---

## 完了条件

### 全体チェックリスト

- [ ] 機能確認
  - 全機能が動作する
  - プロトタイプと同等の UX
  - API 連携が正常

- [ ] テスト確認
  - 単体テストカバレッジ > 80%
  - E2E テスト全て成功
  - パフォーマンステスト合格

- [ ] インフラ確認
  - 全リソースがデプロイされている
  - モニタリングが設定されている
  - CI/CD が動作している

- [ ] ドキュメント確認
  - README が最新
  - API ドキュメントが完成
  - 運用手順書が完成

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
