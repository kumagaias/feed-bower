# Feed Bower - 実装タスクリスト

## 概要

このタスクリストは、プロトタイプから本番環境への移行を段階的に実施するための詳細な手順です。
各タスクには確認事項、テスト項目、UI 確認項目が含まれています。

**プロトタイプの活用**:

- `prototype/` フォルダの既存コードを最大限活用
- 動作確認済みのコンポーネントを `front/` に移行
- 必要に応じて API 連携部分のみ修正

---

## フェーズ 1: 環境構築（1 週間）

### タスク 1.1: リポジトリ・ディレクトリ構造のセットアップ

- [x] タスク 1.1: リポジトリ・ディレクトリ構造のセットアップ
  - リポジトリ作成
  - ディレクトリ構造作成（back/, front/, infra/）
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

- [x] タスク 1.3: DynamoDB Local テーブル作成
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

- [x] タスク 2.1: Go プロジェクト初期化
  - back/.mod 初期化
  - 必要なパッケージのインストール（AWS SDK for Go v2、Lambda runtime、UUID 生成、JWT 認証）
  - ディレクトリ構造作成（cmd, internal, pkg）
  - go.mod が正しく作成されているか
  - 依存関係が解決されているか
  - テスト: `go mod init` → `go mod tidy` → `go build ./...`

---

### タスク 2.2: データモデル実装

- [x] タスク 2.2: データモデル実装
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

- [x] タスク 2.3: Repository 層実装
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

- [x] タスク 2.4: Service 層実装
  - internal/service/auth_service.go 実装（ログイン、JWT トークン生成）
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

- [x] タスク 2.5: Handler 層実装
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

- [x] タスク 2.6: Lambda エントリーポイント実装
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

- [x] タスク 2.7: Dockerfile 作成
  - back/Dockerfile 作成
  - マルチステージビルド設定
  - 最小イメージサイズ最適化
  - Docker イメージがビルドできるか
  - イメージサイズが適切か（< 100MB）
  - コンテナが正常に起動するか
  - テスト: `docker build -t feed-bower-api:latest .` → `docker run -p 8080:8080 feed-bower-api:latest`

---

## フェーズ 3: フロントエンド実装（2 週間）

### タスク 3.1: Next.js プロジェクト初期化

- [x] タスク 3.1: Next.js プロジェクト初期化
  - front/ プロジェクト作成
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

- [x] タスク 3.2: 共通コンポーネント移行
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

- [x] タスク 3.3: バウアー管理機能の統合
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

- [x] タスク 3.4: フィード管理機能の統合
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

### タスク 3.7: 認証機能の統合

- [x] タスク 3.7: 認証機能の統合
  - ログイン画面の実装（`src/app/login/page.tsx`）
  - ログイン機能の実装
  - JWT トークン管理（localStorage）
  - 認証状態管理（Context API）
  - ログアウト機能の実装
  - 認証ガード実装（未認証時のリダイレクト）
  - API リクエストへの認証ヘッダー自動付与
  - トークン有効期限チェック
  - ログイン画面が正しく表示される
  - ログインが正常に動作する
  - JWT トークンが正しく保存・取得される
  - 認証状態が正しく管理される
  - ログアウトが正常に動作する
  - 未認証時に適切にリダイレクトされる
  - 認証機能の E2E テストがパス
  - コンソールエラーがない
  - ログイン画面で「ログイン」ボタンをクリック
  - ログイン成功後、バウアー一覧画面にリダイレクトされる
  - ヘッダーにユーザー名が表示される
  - ログアウトボタンをクリックしてログイン画面に戻る
  - 未認証状態で保護されたページにアクセスするとログイン画面にリダイレクト
  - API 呼び出し時に Authorization ヘッダーが自動で付与される
  - トークン有効期限切れ時に自動でログアウトされる
  - テスト: `npm run test:e2e -- tests/auth.spec.ts` と `npm test -- src/contexts/AuthContext.test.tsx`

---

### タスク 3.8: バウアーフィードプレビュー機能の実装

- [x] タスク 3.8: バウアーフィードプレビュー機能の実装

  - [x] 3.8.1 バウアー記事取得 API メソッドをフロントエンドに追加

    - `front/src/lib/api.ts`の`feedApi`に`getBowerArticles`メソッドを追加
    - bower_id パラメータと記事制限を含む適切な API エンドポイントを設定
    - _要件: 1.1, 1.2_

  - [x] 3.8.2 BowerPreviewModal コンポーネントを作成

    - 新しいコンポーネントファイル`front/src/components/BowerPreviewModal.tsx`を作成
    - ヘッダー、コンテンツエリア、閉じるボタンを含むモーダル構造を実装
    - プロパティとデータ構造の適切な TypeScript インターフェースを追加
    - _要件: 1.1, 3.1, 3.2, 3.3_

  - [x] 3.8.3 記事取得とローディング状態を実装

    - モーダルが開いたときに記事を取得する useEffect フックを追加
    - 「記事を取得中...」メッセージ付きのローディングスピナーを実装
    - 再試行機能付きの API エラーハンドリング
    - _要件: 1.2, 1.3, 4.1, 4.3_

  - [x] 3.8.4 記事グループ化と表示ロジックを実装

    - feed_id を使用してフィードソース別に記事をグループ化
    - 各グループのフィードタイトルと URL を表示
    - 最適な表示のためフィードあたり最大 5 記事に制限
    - _要件: 2.1, 2.2, 2.3_

  - [x] 3.8.5 ArticlePreviewCard サブコンポーネントを作成

    - 記事タイトル、切り詰められたコンテンツ（200 文字）、公開日を表示
    - 新しいタブで開く元記事へのリンクを追加
    - 欠落または空の記事データを適切に処理
    - _要件: 1.4, 2.1_

  - [x] 3.8.6 モーダルインタラクションハンドラーを実装

    - モーダルヘッダーの閉じるボタン機能を追加
    - モーダルを閉じる ESC キーハンドラーを実装
    - クリック外で閉じる機能を追加
    - モーダルが閉じるときに進行中の API リクエストをキャンセル
    - _要件: 3.1, 3.2, 3.3, 4.4_

  - [x] 3.8.7 エラーハンドリングと空状態を追加

    - 記事が利用できないときの「記事が見つかりません」メッセージを表示
    - API 失敗時の再試行ボタン付きエラーメッセージを表示
    - 警告付きで利用可能な記事を表示することで部分的な失敗を処理
    - _要件: 1.5, 1.6, 4.2, 4.3_

  - [x] 3.8.8 BowerPreviewModal を BowerEditModal に統合

    - BowerPreviewModal コンポーネントの import 文を BowerEditModal に追加
    - 適切なプロパティで JSX にモーダルコンポーネントを追加
    - _要件: 1.1_

  - [x] 3.8.9 プレビューボタンをバウアー記事機能に接続

    - 既存のプレビューボタンクリックハンドラーを変更してバウアー記事を取得
    - バウアーデータ（id、name、feeds）を BowerPreviewModal に渡す
    - 競合を避けるために既存のフィードプレビュー機能を削除または更新
    - _要件: 1.1, 1.2_

  - [x] 3.8.10 バウアープレビューの状態管理を追加

    - バウアープレビューモーダルの表示状態を追加
    - バウアー記事データとローディング状態の状態を追加
    - モーダルが閉じるときの適切な状態クリーンアップを実装
    - _要件: 1.1, 4.5_

  - [x] 3.8.11 既存のモーダルパターンと一貫したスタイリングを適用

    - 既存の Tailwind CSS クラスとカラースキームを使用
    - アプリ内の他のモーダルとモーダルヘッダースタイリングを一致
    - 適切な間隔とタイポグラフィの一貫性を確保
    - _要件: 1.4_

  - [x] 3.8.12 異なる画面サイズ用のレスポンシブレイアウトを実装

    - モバイルデバイスで記事を垂直にスタック
    - 小さな画面用にコンテンツプレビューの長さを最適化
    - すべてのデバイスでモーダルが適切にサイズ調整され、スクロール可能であることを確保
    - _要件: 1.4_

  - [x] 3.8.13 テストとエラーハンドリングの検証

    - すべてのインタラクション方法でモーダルが適切に開閉することを確認
    - 空のバウアー（フィードなし）と記事のないバウアーでテスト
    - API エラーシナリオと再試行機能をテスト
    - _要件: 1.5, 1.6, 4.2, 4.3_

  - [x] 3.8.14 記事表示とグループ化を検証
    - 複数のフィードを含むバウアーでテスト
    - 記事コンテンツの切り詰めが正しく動作することを確認
    - 公開日の書式設定と表示をテスト
    - フィードグループ化が適切なタイトルで正しく表示されることを確保
    - _要件: 2.1, 2.2, 2.3, 2.4_

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
  - `infra/modules/lambda/` 作成
  - `infra/modules/dynamodb/` 作成
  - `infra/modules/api-gateway/` 作成
  - `infra/modules/ecr/` 作成
  - `infra/modules/amplify/` 作成
  - Terraform の構文が正しい
  - モジュールが再利用可能
  - `terraform validate` がパスする
  - テスト: `terraform fmt -check` → `terraform validate` → `terraform plan`

---

### タスク 5.2: 開発環境デプロイ

- [ ] タスク 5.2: 開発環境デプロイ
  - `infra/environments/dev/` 設定
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
  - `infra/environments/prod/` 設定
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
  - front/README.md 作成
  - back/README.md 作成
  - infra/README.md 作成
  - セットアップ手順
  - 開発手順
  - デプロイ手順
  - README の内容が正確
  - セットアップ手順が実行できる
  - 全ての README が作成されている
  - テスト: README の手順を実際に実行して確認（新しい環境で手順通りにセットアップできるか確認）

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
**最終更新**: 2025 年 10 月 9 日  
**バージョン**: 1.0
