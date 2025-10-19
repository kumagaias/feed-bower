# Feed Bower - 設計書

## 1. アーキテクチャ概要

### 1.1 システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                         ユーザー                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    フロントエンド (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │   Contexts   │      │
│  │  (App Router)│  │              │  │  (State Mgmt)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST API
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (AWS)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              バックエンド (Go + Lambda)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Handler    │→ │   Service    │→ │  Repository  │      │
│  │   (Lambda)   │  │  (Business)  │  │  (Data)      │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                     ┌──────────────────────────┴──────────┐
                     ▼                                     ▼
          ┌──────────────────┐              ┌──────────────────┐
          │   DynamoDB       │              │   External APIs  │
          │  (NoSQL DB)      │              │  (RSS Feeds)     │
          └──────────────────┘              └──────────────────┘
```

### 1.2 技術選定理由

#### 1.2.1 フロントエンド: Next.js 15

- **SSR/SSG 対応**: SEO 最適化とパフォーマンス向上
- **App Router**: モダンなルーティングとレイアウト管理
- **TypeScript**: 型安全性による開発効率向上
- **AWS Amplify**: AWS 統合と CI/CD

#### 1.2.2 バックエンド: Go + Lambda

- **高パフォーマンス**: Go の高速な実行速度
- **コスト効率**: Lambda のサーバーレスアーキテクチャ
- **スケーラビリティ**: 自動スケーリング
- **コンテナ対応**: ECR でのイメージ管理

#### 1.2.3 インフラ: Terraform + AWS

- **IaC**: コードによるインフラ管理
- **再現性**: 環境の一貫性保証
- **バージョン管理**: Git 連携
- **マルチ環境**: dev/staging/prod の管理

---

## 2. データモデル設計

### 2.1 ER 図

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │1      * │   Bower     │1      * │    Feed     │
│─────────────│◄────────│─────────────│◄────────│─────────────│
│ id (PK)     │         │ id (PK)     │         │ id (PK)     │
│ email       │         │ user_id(FK) │         │ bower_id(FK)│
│ name        │         │ name        │         │ url         │
│ is_guest    │         │ keywords[]  │         │ title       │
│ created_at  │         │ is_public   │         │ description │
└─────────────┘         │ created_at  │         │ last_updated│
                        └─────────────┘         └─────────────┘
                               │1
                               │
                               │*
                        ┌─────────────┐
                        │   Article   │
                        │─────────────│
                        │ id (PK)     │
                        │ feed_id(FK) │
                        │ title       │
                        │ content     │
                        │ url         │
                        │ published_at│
                        │ image_url   │
                        └─────────────┘
                               │*
                               │
                               │1
┌─────────────┐         ┌─────────────┐
│ ChickStats  │1      1 │    User     │
│─────────────│◄────────│─────────────│
│ user_id(PK) │         │             │
│ total_likes │         └─────────────┘
│ level       │                │1
│ experience  │                │
│ checked_days│                │*
└─────────────┘         ┌─────────────┐
                        │ LikedArticle│
                        │─────────────│
                        │ id (PK)     │
                        │ user_id(FK) │
                        │ article_id  │
                        │ liked_at    │
                        └─────────────┘
```

### 2.2 DynamoDB テーブル設計

#### 2.2.1 Users テーブル

```json
{
  "TableName": "Users",
  "KeySchema": [{ "AttributeName": "user_id", "KeyType": "HASH" }],
  "AttributeDefinitions": [
    { "AttributeName": "user_id", "AttributeType": "S" },
    { "AttributeName": "email", "AttributeType": "S" }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "EmailIndex",
      "KeySchema": [{ "AttributeName": "email", "KeyType": "HASH" }]
    }
  ]
}
```

**属性**:

- `user_id` (String, PK): ユーザー ID (UUID)
- `email` (String): メールアドレス
- `password_hash` (String): パスワードハッシュ (bcrypt)
- `name` (String): ユーザー名
- `language` (String): 言語設定 (ja/en)
- `created_at` (Number): 作成日時 (Unix timestamp)
- `updated_at` (Number): 更新日時

#### 2.2.2 Bowers テーブル

```json
{
  "TableName": "Bowers",
  "KeySchema": [{ "AttributeName": "bower_id", "KeyType": "HASH" }],
  "AttributeDefinitions": [
    { "AttributeName": "bower_id", "AttributeType": "S" },
    { "AttributeName": "user_id", "AttributeType": "S" }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "UserIdIndex",
      "KeySchema": [{ "AttributeName": "user_id", "KeyType": "HASH" }]
    }
  ]
}
```

**属性**:

- `bower_id` (String, PK): バウアー ID (UUID)
- `user_id` (String, GSI): ユーザー ID
- `name` (String): バウアー名
- `keywords` (List<String>): キーワード配列
- `color` (String): カラーコード
- `is_public` (Boolean): 公開フラグ
- `created_at` (Number): 作成日時
- `updated_at` (Number): 更新日時

#### 2.2.3 Feeds テーブル

```json
{
  "TableName": "Feeds",
  "KeySchema": [{ "AttributeName": "feed_id", "KeyType": "HASH" }],
  "AttributeDefinitions": [
    { "AttributeName": "feed_id", "AttributeType": "S" },
    { "AttributeName": "bower_id", "AttributeType": "S" }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "BowerIdIndex",
      "KeySchema": [{ "AttributeName": "bower_id", "KeyType": "HASH" }]
    }
  ]
}
```

**属性**:

- `feed_id` (String, PK): フィード ID (UUID)
- `bower_id` (String, GSI): バウアー ID
- `url` (String): フィード URL
- `title` (String): フィードタイトル
- `description` (String): 説明
- `category` (String): カテゴリ
- `last_updated` (Number): 最終更新日時
- `created_at` (Number): 作成日時

#### 2.2.4 Articles テーブル

```json
{
  "TableName": "Articles",
  "KeySchema": [{ "AttributeName": "article_id", "KeyType": "HASH" }],
  "AttributeDefinitions": [
    { "AttributeName": "article_id", "AttributeType": "S" },
    { "AttributeName": "feed_id", "AttributeType": "S" },
    { "AttributeName": "published_at", "AttributeType": "N" }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "FeedIdPublishedAtIndex",
      "KeySchema": [
        { "AttributeName": "feed_id", "KeyType": "HASH" },
        { "AttributeName": "published_at", "KeyType": "RANGE" }
      ]
    }
  ]
}
```

**属性**:

- `article_id` (String, PK): 記事 ID (UUID)
- `feed_id` (String, GSI): フィード ID
- `title` (String): タイトル
- `content` (String): 本文
- `url` (String): 記事 URL
- `image_url` (String): 画像 URL
- `published_at` (Number, GSI Sort Key): 公開日時
- `created_at` (Number): 作成日時

#### 2.2.5 LikedArticles テーブル

```json
{
  "TableName": "LikedArticles",
  "KeySchema": [
    { "AttributeName": "user_id", "KeyType": "HASH" },
    { "AttributeName": "article_id", "KeyType": "RANGE" }
  ],
  "AttributeDefinitions": [
    { "AttributeName": "user_id", "AttributeType": "S" },
    { "AttributeName": "article_id", "AttributeType": "S" }
  ]
}
```

**属性**:

- `user_id` (String, PK): ユーザー ID
- `article_id` (String, Sort Key): 記事 ID
- `liked_at` (Number): いいね日時

#### 2.2.6 ChickStats テーブル

```json
{
  "TableName": "ChickStats",
  "KeySchema": [{ "AttributeName": "user_id", "KeyType": "HASH" }],
  "AttributeDefinitions": [{ "AttributeName": "user_id", "AttributeType": "S" }]
}
```

**属性**:

- `user_id` (String, PK): ユーザー ID
- `total_likes` (Number): 総いいね数
- `level` (Number): レベル
- `experience` (Number): 経験値
- `checked_days` (Number): チェック日数
- `checked_dates` (List<String>): チェック済日付配列
- `updated_at` (Number): 更新日時

---

## 3. API 設計

### 3.1 API エンドポイント一覧

#### 3.1.1 認証 API

| メソッド | エンドポイント     | 説明             |
| -------- | ------------------ | ---------------- |
| POST     | `/api/auth/login`  | ログイン         |
| POST     | `/api/auth/logout` | ログアウト       |
| GET      | `/api/auth/me`     | ユーザー情報取得 |

#### 3.1.2 バウアー API

| メソッド | エンドポイント    | 説明             |
| -------- | ----------------- | ---------------- |
| GET      | `/api/bowers`     | バウアー一覧取得 |
| POST     | `/api/bowers`     | バウアー作成     |
| GET      | `/api/bowers/:id` | バウアー詳細取得 |
| PUT      | `/api/bowers/:id` | バウアー更新     |
| DELETE   | `/api/bowers/:id` | バウアー削除     |

#### 3.1.3 フィード API

| メソッド | エンドポイント           | 説明                             |
| -------- | ------------------------ | -------------------------------- |
| GET      | `/api/feeds`             | フィード一覧取得                 |
| POST     | `/api/feeds`             | フィード追加                     |
| GET      | `/api/feeds/:id`         | フィード詳細取得                 |
| DELETE   | `/api/feeds/:id`         | フィード削除                     |
| GET      | `/api/feeds/:id/preview` | フィードプレビュー               |
| POST     | `/api/feeds/recommend`   | AI フィード推薦（Bedrock Agent） |

#### 3.1.4 記事 API

| メソッド | エンドポイント           | 説明         |
| -------- | ------------------------ | ------------ |
| GET      | `/api/articles`          | 記事一覧取得 |
| GET      | `/api/articles/:id`      | 記事詳細取得 |
| POST     | `/api/articles/:id/like` | いいね       |
| DELETE   | `/api/articles/:id/like` | いいね解除   |
| POST     | `/api/articles/:id/read` | 既読マーク   |

#### 3.1.5 ひよこ API

| メソッド | エンドポイント              | 説明           |
| -------- | --------------------------- | -------------- |
| GET      | `/api/chick/stats`          | ステータス取得 |
| PUT      | `/api/chick/stats`          | ステータス更新 |
| GET      | `/api/chick/liked-articles` | いいね記事一覧 |

### 3.2 API 詳細仕様

#### 3.2.1 POST /api/feeds/recommend - AI フィード推薦

**概要**: Amazon Bedrock AgentCore を使用してキーワードから最適な RSS フィードを推薦

**技術スタック**:

- **AWS Bedrock AgentCore**: LLM ベースのフィード推薦
- **Go SDK**: `github.com/aws/aws-sdk-go-v2/service/bedrockagent`
- **モデル**: Claude 3 Sonnet (推奨)

**リクエスト**:

```json
{
  "keywords": ["AI", "プログラミング", "機械学習"],
  "language": "ja",
  "max_results": 10
}
```

**レスポンス**:

```json
{
  "recommendations": [
    {
      "url": "https://example.com/feed.xml",
      "title": "AI技術ブログ",
      "description": "最新のAI技術動向を発信",
      "category": "Technology",
      "relevance_score": 0.95,
      "reason": "AIと機械学習に関する専門的な記事を提供"
    }
  ],
  "processing_time_ms": 1234
}
```

**Bedrock Agent 実装例（Go）**:

```go
import (
    "context"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
)

func RecommendFeeds(ctx context.Context, keywords []string) ([]Feed, error) {
    cfg, _ := config.LoadDefaultConfig(ctx)
    client := bedrockruntime.NewFromConfig(cfg)

    prompt := fmt.Sprintf(
        "キーワード: %s\n最適なRSSフィードを10個推薦してください。",
        strings.Join(keywords, ", "),
    )

    input := &bedrockruntime.InvokeModelInput{
        ModelId: aws.String("anthropic.claude-3-sonnet-20240229-v1:0"),
        Body:    []byte(prompt),
    }

    result, err := client.InvokeModel(ctx, input)
    // レスポンスをパースしてフィード情報を抽出
    return parseFeeds(result.Body)
}
```

**注意事項**:

- Bedrock API の呼び出しにはコストが発生
- レスポンスタイムは 1-3 秒程度
- キャッシング戦略を検討（同じキーワードの場合）

#### 3.2.2 POST /api/bowers - バウアー作成

**リクエスト**:

```json
{
  "name": "Tech News",
  "keywords": ["AI", "プログラミング", "機械学習"],
  "is_public": false
}
```

**レスポンス**:

```json
{
  "bower_id": "uuid-v4",
  "name": "Tech News",
  "keywords": ["AI", "プログラミング", "機械学習"],
  "color": "#14b8a6",
  "is_public": false,
  "created_at": 1696838400,
  "feeds": []
}
```

#### 3.2.3 GET /api/articles - 記事一覧取得

**クエリパラメータ**:

- `bower_id` (optional): バウアー ID
- `limit` (default: 50): 取得件数
- `offset` (default: 0): オフセット
- `sort` (default: "published_at"): ソート項目
- `order` (default: "desc"): ソート順

**レスポンス**:

```json
{
  "articles": [
    {
      "article_id": "uuid-v4",
      "feed_id": "uuid-v4",
      "title": "Next.js 15の新機能について",
      "content": "...",
      "url": "https://example.com/article",
      "image_url": "https://example.com/image.jpg",
      "published_at": 1696838400,
      "bower": "Tech News",
      "liked": false,
      "read": false
    }
  ],
  "total": 101,
  "has_more": true
}
```

---

## 4. コンポーネント設計

### 4.1 コンポーネント階層

```
App
├── Layout
│   ├── Sidebar (Desktop)
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserMenu
│   ├── MobileHeader (Mobile)
│   │   ├── Logo
│   │   ├── SearchBar
│   │   └── MenuButton
│   ├── Breadcrumb
│   └── ChickIcon
│       └── ChickStatsModal
│           ├── StatsTab
│           └── ArticlesTab
├── Pages
│   ├── LandingPage (/)
│   │   ├── Hero
│   │   ├── Features
│   │   ├── LoginForm
│   │   └── SignupForm
│   ├── FeedsPage (/feeds)
│   │   ├── TabBar
│   │   ├── BowerSelector
│   │   ├── SearchBar
│   │   ├── DateToggle
│   │   └── ArticleList
│   │       └── ArticleCard[]
│   ├── BowersPage (/bowers)
│   │   ├── SearchBar
│   │   ├── CreateButton
│   │   └── BowerList
│   │       └── BowerCard[]
│   ├── BowerCreatePage (/bowers/new)
│   │   └── BowerCreator
│   │       ├── KeywordInput
│   │       ├── KeywordNest
│   │       ├── PreviewModal
│   │       └── FeedSelector
│   └── LikedPage (/liked)
│       └── ArticleList
│           └── ArticleCard[]
└── Common Components
    ├── Button
    ├── Input
    ├── Modal
    ├── Toast
    └── Loading
```

### 4.2 主要コンポーネント仕様

#### 4.2.1 ArticleCard

**Props**:

```typescript
interface ArticleCardProps {
  article: Article;
  language: "ja" | "en";
  isPreviewMode: boolean;
  onArticleClick: (id: string, url: string) => void;
  onToggleRead: (id: string) => void;
  onLike: (id: string) => void;
  t: TranslationObject;
}
```

**責務**:

- 記事情報の表示
- いいね/チェック済の状態管理
- クリックイベントのハンドリング

#### 4.2.2 BowerCard

**Props**:

```typescript
interface BowerCardProps {
  bower: Bower;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}
```

**責務**:

- バウアー情報の表示
- 編集/削除/プレビューアクション

#### 4.2.3 ChickIcon

**Props**:

```typescript
interface ChickIconProps {
  // Context から取得するため props なし
}
```

**責務**:

- ひよこアイコンの表示
- アニメーション制御
- ステータスモーダルの表示

---

## 5. 状態管理設計

### 5.1 Context 構造

```typescript
interface AppContextType {
  // ユーザー
  user: User | null;
  setUser: (user: User | null) => void;

  // バウアー
  bowers: Bower[];
  setBowers: (bowers: Bower[]) => void;
  currentBower: Bower | null;
  setCurrentBower: (bower: Bower | null) => void;

  // ひよこステータス
  chickStats: ChickStats;
  setChickStats: (stats: ChickStats) => void;

  // 言語
  language: "en" | "ja";
  setLanguage: (lang: "en" | "ja") => void;

  // UI状態
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;

  // お気に入り記事
  likedArticles: LikedArticle[];
  setLikedArticles: (articles: LikedArticle[]) => void;
  addLikedArticle: (article: LikedArticle) => void;
  removeLikedArticle: (articleId: string) => void;
}
```

### 5.2 ローカルストレージ管理

**キー一覧**:

```typescript
const STORAGE_KEYS = {
  USER: "feed-bower-user",
  BOWERS: "feed-bower-bowers",
  CHICK_STATS: "feed-bower-chick-stats",
  LIKED_ARTICLES: "feed-bower-liked-articles",
  READ_ARTICLES: "feed-bower-read-articles",
  CHECKED_DATES_HISTORY: "feed-bower-checked-dates-history",
  LANGUAGE: "feed-bower-language",
};
```

**データ永続化戦略**:

- ユーザー情報: ログイン時に保存、ログアウト時に削除
- バウアー: 作成/更新/削除時に同期
- ひよこステータス: アクション時に即座に保存
- 既読記事: 記事クリック時に追加
- チェック済日付: 初回チェック時のみ追加（削除しない）

---

## 6. バックエンド設計

### 6.1 レイヤーアーキテクチャ

```
┌─────────────────────────────────────┐
│         Handler Layer               │  ← Lambda関数エントリーポイント
│  - リクエスト/レスポンス処理         │
│  - バリデーション                    │
│  - エラーハンドリング                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Service Layer               │  ← ビジネスロジック
│  - ドメインロジック                  │
│  - トランザクション管理              │
│  - 外部API連携                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Repository Layer              │  ← データアクセス
│  - DynamoDB操作                      │
│  - クエリ最適化                      │
│  - キャッシング                      │
└─────────────────────────────────────┘
```

### 6.2 Lambda 構成戦略

**MVP（初期実装）**: 単一 Lambda

- 全 API 機能を 1 つの Lambda で実装
- シンプルな構成で開発速度を優先
- RSS 取得も同じ Lambda 内で処理
- **Amazon Bedrock AgentCore 統合**: キーワードからのフィード推薦機能

**Bedrock 統合の詳細**:

- **SDK**: `github.com/aws/aws-sdk-go-v2/service/bedrockruntime`
- **モデル**: Claude 3 Sonnet（推奨）
- **用途**: キーワードベースの RSS フィード推薦
- **Go 対応**: ✅ AWS SDK for Go v2 で完全サポート
- **実装場所**: `internal/service/ai_service.go`

**将来の拡張**: Worker 分離

- パフォーマンス問題発生時に RSS Worker Lambda を分離
- 定期実行（EventBridge）による自動フィード更新
- 重い処理を分離して Core API のレスポンス速度を維持

**分離の判断基準**:

- Lambda 実行時間が 10 秒を超える
- RSS 取得でタイムアウトが頻発
- 同時実行数の制御が必要になった場合

### 6.3 Go パッケージ構成

```
back/
├── cmd/
│   └── lambda/
│       └── main.go                    # Lambda エントリーポイント（単一Lambda）
│       # 将来: worker/main.go を追加してRSS Worker分離
├── internal/
│   ├── handler/                       # Handler層
│   │   ├── auth_handler.go
│   │   ├── bower_handler.go
│   │   ├── feed_handler.go
│   │   ├── article_handler.go
│   │   └── chick_handler.go
│   ├── service/                       # Service層
│   │   ├── auth_service.go
│   │   ├── bower_service.go
│   │   ├── feed_service.go
│   │   ├── article_service.go
│   │   ├── chick_service.go
│   │   ├── rss_service.go            # RSS取得
│   │   └── ai_service.go             # Bedrock AgentCore統合
│   ├── repository/                    # Repository層
│   │   ├── user_repository.go
│   │   ├── bower_repository.go
│   │   ├── feed_repository.go
│   │   ├── article_repository.go
│   │   └── chick_repository.go
│   ├── model/                         # データモデル
│   │   ├── user.go
│   │   ├── bower.go
│   │   ├── feed.go
│   │   ├── article.go
│   │   └── chick.go
│   └── middleware/                    # ミドルウェア
│       ├── auth.go
│       ├── cors.go
│       └── logger.go
├── pkg/                               # 公開パッケージ
│   ├── dynamodb/                      # DynamoDB クライアント
│   ├── bedrock/                       # Bedrock クライアント
│   ├── validator/                     # バリデーション
│   └── response/                      # レスポンスヘルパー
├── Dockerfile                         # 単一Lambdaイメージ
│   # 将来: Dockerfile.worker を追加
└── go.mod
```

### 6.4 主要な処理フロー

#### 6.3.1 記事取得フロー

```
1. Handler: リクエスト受信
   ↓
2. Middleware: 認証チェック
   ↓
3. Handler: パラメータバリデーション
   ↓
4. Service: ビジネスロジック実行
   - バウアーIDから関連フィードを取得
   - 各フィードの記事を取得
   - ソート・フィルタリング
   ↓
5. Repository: DynamoDB クエリ
   - Articles テーブルから取得
   - LikedArticles と結合
   ↓
6. Handler: レスポンス返却
```

#### 6.3.2 RSS フィード取得フロー

```
1. Service: RSS URL を受信
   ↓
2. RSS Service: フィード取得
   - HTTP GET リクエスト
   - XML パース
   - 記事データ抽出
   ↓
3. Service: データ変換
   - Article モデルに変換
   - 画像URL抽出
   ↓
4. Repository: DynamoDB 保存
   - Articles テーブルに挿入
   - 重複チェック
```

---

## 7. インフラ設計

### 7.1 AWS リソース構成

**MVP 構成（単一 Lambda）**:

```
┌─────────────────────────────────────────────────────────┐
│              AWS Amplify Hosting                        │
│           - Next.js SSR/SSG対応                          │
│           - CloudFront CDN統合                           │
│           - SSL/TLS 自動設定                             │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │ API Gateway  │
      │  - REST API  │
      │  - CORS設定  │
      └──────┬───────┘
                      │
                      ▼
               ┌──────────────┐
               │ Core Lambda  │
               │  (Go + ECR)  │
               │ - API処理    │
               │ - RSS取得    │
               └──────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │DynamoDB │  │CloudWatch│  │ Secrets │
   │ (NoSQL) │  │  (Logs)  │  │ Manager │
   └─────────┘  └─────────┘  └─────────┘
```

**将来の拡張構成（Worker 分離後）**:

```
API Gateway → Core Lambda (API処理)
                    ↓
                DynamoDB
                    ↑
EventBridge → RSS Worker Lambda (定期実行)
```

### 7.2 Terraform モジュール構成

#### 7.2.1 Lambda モジュール

```hcl
module "lambda" {
  source = "./modules/lambda"

  function_name = "feed-bower-api"
  image_uri     = "${aws_ecr_repository.app.repository_url}:latest"
  memory_size   = 512
  timeout       = 30

  environment_variables = {
    DYNAMODB_TABLE_PREFIX = var.table_prefix
    LOG_LEVEL            = var.log_level
  }

  vpc_config = {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }
}
```

#### 7.2.2 DynamoDB モジュール

```hcl
module "dynamodb" {
  source = "./modules/dynamodb"

  tables = [
    {
      name           = "Users"
      hash_key       = "user_id"
      billing_mode   = "PAY_PER_REQUEST"
      global_indexes = [
        {
          name     = "EmailIndex"
          hash_key = "email"
        }
      ]
    },
    {
      name         = "Bowers"
      hash_key     = "bower_id"
      billing_mode = "PAY_PER_REQUEST"
      global_indexes = [
        {
          name     = "UserIdIndex"
          hash_key = "user_id"
        }
      ]
    }
  ]
}
```

#### 7.2.3 API Gateway モジュール

```hcl
module "api_gateway" {
  source = "./modules/api-gateway"

  api_name        = "feed-bower-api"
  lambda_arn      = module.lambda.function_arn
  stage_name      = var.environment

  cors_configuration = {
    allow_origins = ["https://feed-bower.com"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}
```

### 7.3 環境別設定

#### 7.3.1 Development

- Lambda: 512MB メモリ
- DynamoDB: オンデマンド課金
- CloudWatch: 7 日間ログ保持
- コスト重視

#### 7.3.2 Staging

- Lambda: 1024MB メモリ
- DynamoDB: オンデマンド課金
- CloudWatch: 14 日間ログ保持
- 本番環境のテスト

#### 7.3.3 Production

- Lambda: 2048MB メモリ
- DynamoDB: プロビジョンド課金 + Auto Scaling
- CloudWatch: 30 日間ログ保持
- パフォーマンス重視

---

## 8. セキュリティ設計

### 8.1 認証・認可

#### 8.1.1 JWT トークン

**トークン構造**:

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": "uuid-v4",
    "email": "user@example.com",
    "exp": 1696924800,
    "iat": 1696838400
  }
}
```

**トークン管理**:

- 有効期限: 7 日間
- リフレッシュトークン: 30 日間
- httpOnly Cookie に保存
- CSRF トークンと併用

#### 8.1.2 API 認証フロー

```
1. ユーザーログイン
   ↓
2. JWT トークン発行
   ↓
3. Cookie に保存
   ↓
4. API リクエスト時に Cookie 送信
   ↓
5. Lambda で JWT 検証
   ↓
6. user_id を Context に設定
   ↓
7. ビジネスロジック実行
```

### 8.2 データ保護

#### 8.2.1 暗号化

- **転送中**: TLS 1.3
- **保存時**: DynamoDB 暗号化（AWS KMS）
- **機密情報**: Secrets Manager

#### 8.2.2 アクセス制御

- **IAM ロール**: 最小権限の原則
- **VPC**: Lambda を VPC 内に配置
- **セキュリティグループ**: 必要なポートのみ開放

### 8.3 入力検証

#### 8.3.1 バリデーションルール

```go
type BowerCreateRequest struct {
    Name      string   `json:"name" validate:"required,min=1,max=50"`
    Keywords  []string `json:"keywords" validate:"required,min=1,max=8,dive,min=1,max=20"`
    IsPublic  bool     `json:"is_public"`
}
```

#### 8.3.2 サニタイゼーション

- HTML タグの除去
- SQL インジェクション対策（DynamoDB は NoSQL）
- XSS 対策

---

## 9. パフォーマンス最適化

### 9.1 フロントエンド最適化

#### 9.1.1 コード分割

```typescript
// 動的インポート
const BowerCreator = dynamic(() => import("@/components/BowerCreator"));
const ChickStatsModal = dynamic(() => import("@/components/ChickStatsModal"));
```

#### 9.1.2 画像最適化

- Next.js Image コンポーネント使用
- WebP フォーマット
- 遅延読み込み
- レスポンシブ画像

#### 9.1.3 キャッシング

- SWR / React Query 使用
- stale-while-revalidate 戦略
- localStorage キャッシュ

### 9.2 バックエンド最適化

#### 9.2.1 DynamoDB 最適化

- GSI の適切な設計
- バッチ処理の活用
- クエリの最適化
- DAX（DynamoDB Accelerator）検討

#### 9.2.2 Lambda 最適化

- コールドスタート対策
  - Provisioned Concurrency
  - 軽量なコンテナイメージ
- メモリサイズの最適化
- 並列実行数の調整

#### 9.2.3 API Gateway 最適化

- レスポンスキャッシング
- スロットリング設定
- バーストリミット

---

## 10. モニタリング・ログ設計

### 10.1 ログ戦略

#### 10.1.1 ログレベル

- **ERROR**: エラー発生時
- **WARN**: 警告（リトライ可能なエラー）
- **INFO**: 重要なイベント（ログイン、作成、削除）
- **DEBUG**: デバッグ情報（開発環境のみ）

#### 10.1.2 ログフォーマット

```json
{
  "timestamp": "2024-10-09T12:00:00Z",
  "level": "INFO",
  "service": "feed-bower-api",
  "function": "CreateBower",
  "user_id": "uuid-v4",
  "request_id": "uuid-v4",
  "message": "Bower created successfully",
  "metadata": {
    "bower_id": "uuid-v4",
    "bower_name": "Tech News"
  }
}
```

### 10.2 メトリクス

#### 10.2.1 CloudWatch メトリクス

- Lambda 実行時間
- Lambda エラー率
- API Gateway リクエスト数
- DynamoDB 読み取り/書き込みキャパシティ
- DynamoDB スロットリング

#### 10.2.2 カスタムメトリクス

- ユーザー登録数
- バウアー作成数
- 記事取得数
- いいね数
- レベルアップ数

### 10.3 アラート設定

#### 10.3.1 重要度: Critical

- Lambda エラー率 > 5%
- API Gateway 5xx エラー > 10 件/分
- DynamoDB スロットリング発生

#### 10.3.2 重要度: Warning

- Lambda 実行時間 > 10 秒
- API Gateway レイテンシ > 3 秒
- DynamoDB 読み取りキャパシティ > 80%

---

## 11. テスト戦略

### 11.1 フロントエンドテスト

#### 11.1.1 単体テスト（Jest + React Testing Library）

```typescript
describe("ArticleCard", () => {
  it("should render article information", () => {
    const article = mockArticle();
    render(<ArticleCard article={article} {...props} />);

    expect(screen.getByText(article.title)).toBeInTheDocument();
    expect(screen.getByText(article.bower)).toBeInTheDocument();
  });

  it("should call onLike when like button clicked", () => {
    const onLike = jest.fn();
    render(<ArticleCard {...props} onLike={onLike} />);

    fireEvent.click(screen.getByRole("button", { name: /like/i }));
    expect(onLike).toHaveBeenCalledWith(article.id);
  });
});
```

#### 11.1.2 E2E テスト（Playwright）

```typescript
test("user can create a bower", async ({ page }) => {
  await page.goto("/bowers");
  await page.click("text=バウアーを作成");

  await page.fill('input[name="keyword"]', "AI");
  await page.click("text=追加");

  await page.fill('input[name="keyword"]', "プログラミング");
  await page.click("text=追加");

  await page.click("text=次へ");
  await page.click("text=完了");

  await expect(page.locator("text=AI")).toBeVisible();
});
```

### 11.2 バックエンドテスト

#### 11.2.1 単体テスト（Go testing）

```go
func TestBowerService_CreateBower(t *testing.T) {
    repo := &mockBowerRepository{}
    service := NewBowerService(repo)

    bower := &model.Bower{
        Name:     "Tech News",
        Keywords: []string{"AI", "Programming"},
    }

    result, err := service.CreateBower(context.Background(), "user-id", bower)

    assert.NoError(t, err)
    assert.NotEmpty(t, result.ID)
    assert.Equal(t, "Tech News", result.Name)
}
```

#### 11.2.2 統合テスト

```go
func TestBowerHandler_Integration(t *testing.T) {
    // DynamoDB Local を使用
    db := setupTestDB(t)
    defer db.Cleanup()

    handler := NewBowerHandler(db)

    req := createTestRequest("POST", "/api/bowers", bowerJSON)
    resp := handler.Handle(req)

    assert.Equal(t, 201, resp.StatusCode)
}
```

### 11.3 テストカバレッジ目標

- 単体テスト: 80%以上
- 統合テスト: 主要フロー 100%
- E2E テスト: クリティカルパス 100%

---

## 12. デプロイ戦略

### 12.1 CI/CD パイプライン

**デプロイフロー**:

```
GitHub Push
    ↓
GitHub Actions
    ↓
┌─────────────────┐
│  1. Lint        │
│  2. Test        │
│  3. Build       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Front  │ │  Back  │
│ Build  │ │ Build  │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────┐ ┌────────┐
│Amplify │ │  ECR   │
│ Deploy │ │ Push   │
└────────┘ └───┬────┘
               │
               ▼
         ┌──────────┐
         │ Lambda   │
         │ Update   │
         └──────────┘

※ インフラ (Terraform) は手元で apply
```

### 12.2 GitHub Actions ワークフロー

#### 12.2.1 .github/workflows/deploy-frontend.yml

```yaml
name: Deploy Frontend

on:
  push:
    branches:
      - main
      - develop
    paths:
      - "front/**"
      - ".github/workflows/deploy-frontend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
          cache-dependency-path: front/package-lock.json

      - name: Install dependencies
        working-directory: front/
        run: npm ci

      - name: Run linter
        working-directory: front/
        run: npm run lint

      - name: Run tests
        working-directory: front/
        run: npm test

      - name: Build
        working-directory: front/
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to Amplify
        run: |
          # Amplify アプリIDを環境変数から取得
          APP_ID=${{ secrets.AMPLIFY_APP_ID }}
          BRANCH_NAME=${{ github.ref == 'refs/heads/main' && 'main' || 'develop' }}

          # デプロイをトリガー
          aws amplify start-job \
            --app-id $APP_ID \
            --branch-name $BRANCH_NAME \
            --job-type RELEASE
```

#### 12.2.2 .github/workflows/deploy-backend.yml

```yaml
name: Deploy Backend

on:
  push:
    branches:
      - main
      - develop
    paths:
      - "back/**"
      - ".github/workflows/deploy-backend.yml"

env:
  AWS_REGION: ap-northeast-1
  ECR_REPOSITORY: feed-bower-api

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: "1.23"
          cache-dependency-path: back/.sum

      - name: Run linter
        working-directory: back/
        run: |
          go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
          golangci-lint run

      - name: Run tests
        working-directory: back/
        run: go test -v -race -coverprofile=coverage.out ./...

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./back/coverage.out
          flags: backend

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        working-directory: back/
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Update Lambda function
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
          LAMBDA_FUNCTION_NAME: feed-bower-api
        run: |
          aws lambda update-function-code \
            --function-name $LAMBDA_FUNCTION_NAME \
            --image-uri $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

          # 更新完了を待つ
          aws lambda wait function-updated \
            --function-name $LAMBDA_FUNCTION_NAME

      - name: Publish Lambda version
        if: github.ref == 'refs/heads/main'
        env:
          LAMBDA_FUNCTION_NAME: feed-bower-api
        run: |
          VERSION=$(aws lambda publish-version \
            --function-name $LAMBDA_FUNCTION_NAME \
            --query 'Version' \
            --output text)

          echo "Published version: $VERSION"

          # エイリアスを更新 (本番環境)
          aws lambda update-alias \
            --function-name $LAMBDA_FUNCTION_NAME \
            --name production \
            --function-version $VERSION
```

#### 12.2.3 .github/workflows/pr-check.yml

```yaml
name: PR Check

on:
  pull_request:
    branches:
      - main
      - develop

jobs:
  frontend-check:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.changed_files, 'front/')

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
          cache-dependency-path: front/package-lock.json

      - name: Install dependencies
        working-directory: front/
        run: npm ci

      - name: Lint
        working-directory: front/
        run: npm run lint

      - name: Test
        working-directory: front/
        run: npm test

      - name: Build
        working-directory: front/
        run: npm run build

  backend-check:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.changed_files, 'back/')

    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: "1.23"
          cache-dependency-path: back/.sum

      - name: Lint
        working-directory: back/
        run: |
          go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
          golangci-lint run

      - name: Test
        working-directory: back/
        run: go test -v -race ./...
```

### 12.3 必要なシークレット設定

GitHub リポジトリの Settings > Secrets and variables > Actions で設定:

**共通（AWS 認証）**:

- `AWS_ACCESS_KEY_ID`: AWS アクセスキー
- `AWS_SECRET_ACCESS_KEY`: AWS シークレットキー

**フロントエンド用**:

- `AMPLIFY_APP_ID`: Amplify アプリケーション ID
- `API_URL`: バックエンド API の URL

### 12.4 デプロイフロー

#### 12.4.1 Development

- プルリクエスト作成時に自動デプロイ
- プレビュー環境作成
- 自動テスト実行

#### 12.4.2 Production (main ブランチ)

- main ブランチマージ時: 自動デプロイ
- Amplify: main ブランチ（本番環境）
- Lambda: バージョン発行 + エイリアス更新
- ロールバック可能

### 12.5 インフラ管理（手動）

**Terraform の実行**:

```bash
# 初回セットアップ
cd infra/environments/prod
terraform init

# プラン確認
terraform plan

# 適用
terraform apply

# 環境別の適用
cd infra/environments/development
terraform apply
```

**インフラ変更フロー**:

1. ローカルで Terraform コード編集
2. `terraform plan` で変更内容確認
3. レビュー後、`terraform apply` で適用
4. 変更を Git にコミット・プッシュ

**注意事項**:

- インフラ変更は慎重に実施
- 本番環境は必ず `terraform plan` で確認
- State ファイルは S3 バックエンドで管理推奨

### 12.6 ロールバック戦略

**フロントエンド**:

```bash
# Amplify コンソールから前のデプロイに戻す
# または AWS CLI でロールバック
aws amplify start-job \
  --app-id <app-id> \
  --branch-name main \
  --job-type RELEASE \
  --job-id <previous-job-id>
```

**バックエンド**:

```bash
# Lambda エイリアスを前のバージョンに戻す
aws lambda update-alias \
  --function-name feed-bower-api \
  --name production \
  --function-version <previous-version>
```

**データベース**:

- DynamoDB のポイントインタイムリカバリ
- バックアップからの復元

---

## 13. 移行計画

### 13.1 プロトタイプから本番への移行

#### フェーズ 1: バックエンド構築（2 週間）

- [ ] Go Lambda 関数実装
- [ ] DynamoDB テーブル作成
- [ ] API Gateway 設定
- [ ] 認証機能実装

#### フェーズ 2: フロントエンド統合（2 週間）

- [ ] API クライアント実装
- [ ] localStorage から API へ移行
- [ ] エラーハンドリング強化
- [ ] ローディング状態の改善

#### フェーズ 3: RSS 機能実装（2 週間）

- [ ] RSS パーサー実装
- [ ] フィード取得スケジューラー
- [ ] 記事の自動更新
- [ ] 画像プロキシ

#### フェーズ 4: テスト・最適化（1 週間）

- [ ] 統合テスト
- [ ] パフォーマンステスト
- [ ] セキュリティ監査
- [ ] ドキュメント整備

#### フェーズ 5: デプロイ（1 週間）

- [ ] Terraform 実行
- [ ] CI/CD 設定
- [ ] モニタリング設定
- [ ] 本番デプロイ

---

## 14. ローカル開発環境

### 14.1 Dev Container 構成

**使用バージョン**:

- Node.js: **24 (LTS)**
- Go: **1.23**
- DynamoDB Local: latest

**データベース戦略**:

- **ローカル開発**: DynamoDB Local (Docker コンテナ)
  - AWS DynamoDB と互換性のあるローカル版
  - データは永続化（Docker volume）
  - GUI ツール（DynamoDB Admin）で確認可能
  - テーブル構造は本番と同一
- **本番環境**: AWS DynamoDB

#### 14.1.1 全体構成

```
.devcontainer/
├── devcontainer.json          # Dev Container設定
├── docker-compose.yml         # マルチコンテナ構成
├── Dockerfile.frontend        # フロントエンド用 (Node.js 24)
├── Dockerfile.backend         # バックエンド用 (Go 1.23)
└── dynamodb-local/            # DynamoDB Local設定
```

#### 14.1.2 docker-compose.yml

```yaml
version: "3.8"

services:
  # フロントエンド (Next.js)
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    volumes:
      - ../front/:/workspace/front
      - /workspace/front/node_modules
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    command: npm run dev
    depends_on:
      - backend

  # バックエンド (Go)
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    volumes:
      - ../back/:/workspace/back
    ports:
      - "8080:8080"
    environment:
      - AWS_REGION=ap-northeast-1
      - AWS_ACCESS_KEY_ID=dummy
      - AWS_SECRET_ACCESS_KEY=dummy
      - DYNAMODB_ENDPOINT=http://dynamodb-local:8000
      - LOG_LEVEL=debug
    command: air # ホットリロード
    depends_on:
      - dynamodb-local

  # DynamoDB Local
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath /data"
    volumes:
      - dynamodb-data:/data

  # DynamoDB Admin (GUI)
  dynamodb-admin:
    image: aaronshaf/dynamodb-admin:latest
    ports:
      - "8001:8001"
    environment:
      - DYNAMO_ENDPOINT=http://dynamodb-local:8000
      - AWS_REGION=ap-northeast-1
      - AWS_ACCESS_KEY_ID=dummy
      - AWS_SECRET_ACCESS_KEY=dummy
    depends_on:
      - dynamodb-local

volumes:
  dynamodb-data:
```

#### 14.1.3 Dockerfile.frontend

```dockerfile
FROM node:24-alpine

WORKDIR /workspace/front

# 開発ツールのインストール
RUN apk add --no-cache git

# グローバルパッケージ
RUN npm install -g npm@latest

# ユーザー設定
RUN addgroup -g 1000 developer && \
    adduser -D -u 1000 -G developer developer

USER developer

CMD ["npm", "run", "dev"]
```

#### 14.1.4 Dockerfile.backend

```dockerfile
FROM golang:1.23-alpine

WORKDIR /workspace/back

# 開発ツールのインストール
RUN apk add --no-cache git make gcc musl-dev

# Air (ホットリロード) のインストール
RUN go install github.com/cosmtrek/air@latest

# AWS CLI のインストール
RUN apk add --no-cache aws-cli

# ユーザー設定
RUN addgroup -g 1000 developer && \
    adduser -D -u 1000 -G developer developer && \
    chown -R developer:developer /go

USER developer

CMD ["air"]
```

#### 14.1.5 devcontainer.json

```json
{
  "name": "Feed Bower Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "frontend",
  "workspaceFolder": "/workspace",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "golang.go",
        "ms-azuretools.vscode-docker",
        "amazonwebservices.aws-toolkit-vscode"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "[go]": {
          "editor.defaultFormatter": "golang.go"
        }
      }
    }
  },
  "forwardPorts": [3000, 8080, 8000, 8001],
  "portsAttributes": {
    "3000": {
      "label": "Frontend (Next.js)",
      "onAutoForward": "notify"
    },
    "8080": {
      "label": "Backend (Go API)",
      "onAutoForward": "notify"
    },
    "8000": {
      "label": "DynamoDB Local",
      "onAutoForward": "silent"
    },
    "8001": {
      "label": "DynamoDB Admin",
      "onAutoForward": "notify"
    }
  },
  "postCreateCommand": "bash .devcontainer/setup.sh"
}
```

### 14.2 セットアップスクリプト

#### 14.2.1 .devcontainer/setup.sh

```bash
#!/bin/bash

echo "🚀 Setting up Feed Bower development environment..."

# フロントエンドのセットアップ
echo "📦 Installing frontend dependencies..."
cd /workspace/front/
npm install

# バックエンドのセットアップ
echo "🔧 Installing backend dependencies..."
cd /workspace/back/
go mod download

# DynamoDB テーブル作成
echo "🗄️  Creating DynamoDB tables..."
cd /workspace
bash scripts/create-dynamodb-tables.sh

echo "✅ Setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8080"
echo "  - DynamoDB Admin: http://localhost:8001"
```

#### 14.2.2 scripts/create-dynamodb-tables.sh

```bash
#!/bin/bash

ENDPOINT="http://dynamodb-local:8000"
REGION="ap-northeast-1"

# Users テーブル
aws dynamodb create-table \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  --table-name Users \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=user_id,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"EmailIndex\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

# Bowers テーブル
aws dynamodb create-table \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  --table-name Bowers \
  --attribute-definitions \
    AttributeName=bower_id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
  --key-schema \
    AttributeName=bower_id,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"UserIdIndex\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

# 他のテーブルも同様に作成...

echo "✅ All tables created successfully!"
```

### 14.3 開発フロー

#### 14.3.1 初回セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/your-org/feed-bower.git
cd feed-bower

# 2. VS Code で開く
code .

# 3. Dev Container で再度開く
# コマンドパレット (Cmd/Ctrl+Shift+P)
# > Dev Containers: Reopen in Container

# 4. 自動セットアップが実行される
# - 依存関係のインストール
# - DynamoDB テーブル作成
# - 環境構築完了
```

#### 14.3.2 日常の開発

```bash
# フロントエンド開発
cd /workspace/front/
npm run dev
# → http://localhost:3000

# バックエンド開発
cd /workspace/back/
air  # ホットリロード有効
# → http://localhost:8080

# DynamoDB 確認
# → http://localhost:8001 (DynamoDB Admin)

# テスト実行
npm test              # フロントエンド
go test ./...         # バックエンド
```

#### 14.3.3 API 動作確認

```bash
# ヘルスチェック
curl http://localhost:8080/health

# バウアー作成
curl -X POST http://localhost:8080/api/bowers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Tech News",
    "keywords": ["AI", "Programming"]
  }'
```

### 14.4 デバッグ設定

#### 14.4.1 .vscode/launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "cwd": "${workspaceFolder}/front/"
    },
    {
      "name": "Go: Debug Lambda",
      "type": "go",
      "request": "launch",
      "mode": "debug",
      "program": "${workspaceFolder}/back/cmd/lambda",
      "env": {
        "AWS_REGION": "ap-northeast-1",
        "DYNAMODB_ENDPOINT": "http://localhost:8000"
      }
    }
  ]
}
```

### 14.5 トラブルシューティング

#### 14.5.1 よくある問題

**問題**: DynamoDB Local に接続できない

```bash
# 解決策: コンテナの再起動
docker-compose restart dynamodb-local

# テーブルの再作成
bash scripts/create-dynamodb-tables.sh
```

**問題**: フロントエンドがバックエンドに接続できない

```bash
# 解決策: 環境変数の確認
echo $NEXT_PUBLIC_API_URL
# → http://backend:8080 であることを確認

# docker-compose.yml の depends_on を確認
```

**問題**: Go のホットリロードが動かない

```bash
# 解決策: Air の設定確認
cd /workspace/back/
cat .air.toml

# Air の再起動
pkill air
air
```

### 14.6 本番環境との差異

| 項目         | ローカル         | 本番               |
| ------------ | ---------------- | ------------------ |
| データベース | DynamoDB Local   | DynamoDB (AWS)     |
| 認証         | 簡易 JWT         | Cognito / 本格 JWT |
| ストレージ   | ローカルファイル | S3                 |
| ログ         | コンソール       | CloudWatch         |
| 環境変数     | .env ファイル    | Secrets Manager    |

---

## 15. 付録

### 15.1 技術的な制約・前提条件

**本番環境**:

- AWS アカウント必須
- Go 1.23 以上
- Node.js 24 (LTS) 以上
- Terraform 1.5 以上

**ローカル開発環境**:

- Docker & Docker Compose
- VS Code + Dev Containers 拡張機能
- DynamoDB Local（Docker コンテナで自動起動）

### 15.2 DynamoDB Local について

**特徴**:

- AWS DynamoDB のローカル版
- 完全互換の API
- データ永続化対応
- 無料で使用可能

**制限事項**:

- TTL（Time To Live）機能なし
- ストリーム機能の一部制限
- パフォーマンス特性が本番と異なる

**推奨用途**:

- ローカル開発・テスト
- CI/CD パイプライン
- オフライン開発

### 15.3 参考資料

- [AWS Lambda Go](https://docs.aws.amazon.com/lambda/latest/dg/golang-handler.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Next.js Documentation](https://nextjs.org/docs)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

**作成者**: Kiro AI Assistant  
**最終更新**: 2025 年 10 月 9 日  
**バージョン**: 1.0
