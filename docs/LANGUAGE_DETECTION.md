# 言語自動検出機能

## 概要

ユーザーがログインしていない場合、ブラウザの言語設定から自動的に日本語（ja）または英語（en）を検出して表示します。ユーザー登録時も、ブラウザの言語設定を基に自動的に言語設定が登録されます。

## 実装内容

### 1. フロントエンド（ブラウザ言語検出）

#### `front/src/contexts/AppContext.tsx`

- **`detectBrowserLanguage()`関数**: ブラウザの`navigator.language`から言語を検出
  - `ja`で始まる場合 → 日本語（`ja`）
  - それ以外 → 英語（`en`）

- **初期言語設定**: `AppProvider`の初期状態でブラウザ言語を使用

- **ログイン後の言語同期**:
  - ユーザーがログインすると、バックエンドから言語設定を取得
  - バックエンドに言語設定がない場合、ブラウザ言語を自動的に保存

```typescript
// ブラウザ言語検出
const detectBrowserLanguage = (): 'ja' | 'en' => {
  if (typeof window === 'undefined') return 'en'
  
  const browserLang = navigator.language || (navigator as any).userLanguage
  return browserLang.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}
```

#### `front/src/components/SignupModal.tsx`

- サインアップフォームのデフォルト言語として、ブラウザ検出言語を使用
- ユーザーは登録時に言語を変更可能（日本語/英語）

### 2. バックエンド（Accept-Languageヘッダー検出）

#### `back/internal/middleware/auth.go`

- **`detectPreferredLanguage()`関数**: HTTPリクエストの`Accept-Language`ヘッダーから言語を検出
  - ヘッダー例: `"ja,en-US;q=0.9,en;q=0.8"`
  - 最初の言語コードを抽出（`ja-JP` → `ja`）

- **認証ミドルウェア**: リクエストコンテキストに`preferred_language`を保存
  - `Auth`ミドルウェア: 認証が必要なエンドポイント
  - `OptionalAuth`ミドルウェア: 認証がオプショナルなエンドポイント

```go
func detectPreferredLanguage(acceptLanguage string) string {
  // Accept-Languageヘッダーをパース
  // 例: "ja,en-US;q=0.9" → "ja"
}
```

#### `back/internal/service/cognito_auth_service.go`

- **`detectLanguageFromContext()`関数**: コンテキストから言語を取得
  - `ja`で始まる場合 → 日本語（`ja`）
  - それ以外 → 英語（`en`）
  - デフォルト: 日本語（`ja`）

- **`getOrCreateUser()`関数**: 新規ユーザー作成時に検出した言語を設定
  - Cognito経由でログインした新規ユーザーに自動適用

```go
func (s *CognitoAuthService) getOrCreateUser(ctx context.Context, cognitoUserID, email string) (*model.User, error) {
  // 既存ユーザーをチェック...
  
  // 新規ユーザー作成時
  language := detectLanguageFromContext(ctx)
  user = &model.User{
    UserID:   cognitoUserID,
    Email:    email,
    Name:     strings.Split(email, "@")[0],
    Language: language, // ブラウザ言語を使用
    // ...
  }
}
```

## 動作フロー

### 未ログイン時

1. ユーザーがサイトにアクセス
2. `AppContext`がブラウザの`navigator.language`を検出
3. 日本語ブラウザ → 日本語UI、英語ブラウザ → 英語UI

### サインアップ時

1. ユーザーがサインアップフォームを開く
2. 言語選択のデフォルトがブラウザ言語に設定される
3. ユーザーは必要に応じて言語を変更可能
4. サインアップ後、初回ログイン時に言語設定がバックエンドに保存される

### 初回ログイン時（Cognito経由）

1. ユーザーがログイン
2. フロントエンドがバックエンドAPIを呼び出し（`Accept-Language`ヘッダー付き）
3. バックエンドが新規ユーザーを作成
4. `Accept-Language`ヘッダーから言語を検出
5. 検出した言語でユーザーレコードを作成
6. フロントエンドがユーザー情報を取得し、言語設定を同期

### 既存ユーザーのログイン時

1. ユーザーがログイン
2. バックエンドから保存済みの言語設定を取得
3. フロントエンドのUIが保存済み言語で表示される

## 対応言語

- **日本語（ja）**: ブラウザ言語が`ja`で始まる場合
- **英語（en）**: それ以外のすべての言語

## テスト方法

### ブラウザ言語の変更

#### Chrome/Edge
1. 設定 → 言語
2. 優先言語を変更
3. ブラウザを再起動

#### Firefox
1. 設定 → 言語
2. 優先言語を変更
3. ブラウザを再起動

#### Safari
1. システム環境設定 → 言語と地域
2. 優先言語を変更
3. ブラウザを再起動

### 動作確認

1. **未ログイン時**:
   - ブラウザ言語を日本語に設定 → サイトが日本語で表示される
   - ブラウザ言語を英語に設定 → サイトが英語で表示される

2. **サインアップ時**:
   - サインアップフォームの言語選択がブラウザ言語と一致する
   - 言語を変更してサインアップ可能

3. **初回ログイン時**:
   - ログイン後、ブラウザ言語が自動的にバックエンドに保存される
   - 次回ログイン時も同じ言語設定が維持される

## 注意事項

- ユーザーは設定画面から言語を手動で変更可能
- 手動変更した言語設定は、ブラウザ言語より優先される
- `Accept-Language`ヘッダーは初回ユーザー作成時のみ使用される
- 既存ユーザーの言語設定は変更されない

## 関連ファイル

### フロントエンド
- `front/src/contexts/AppContext.tsx` - ブラウザ言語検出とコンテキスト管理
- `front/src/components/SignupModal.tsx` - サインアップフォーム
- `front/src/lib/i18n.ts` - 翻訳定義

### バックエンド
- `back/internal/middleware/auth.go` - Accept-Languageヘッダー検出
- `back/internal/service/cognito_auth_service.go` - ユーザー作成時の言語設定
- `back/internal/model/user.go` - ユーザーモデル（言語フィールド）
- `back/internal/handler/auth_handler.go` - 認証API（言語更新）
