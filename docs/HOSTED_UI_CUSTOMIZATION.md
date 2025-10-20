# Cognito Hosted UI カスタマイズガイド

## 概要

Feed BowerのCognito Hosted UIは、現在のログインモーダルのデザインに合わせてカスタマイズされています。

## デザイン仕様

### カラーパレット

| 要素 | カラー | 用途 |
|------|--------|------|
| プライマリ | `#14b8a6` (ティール) | ボタン、リンク |
| ホバー | `#505050` (ダークグレー) | ボタンホバー |
| アクセント | `#f59e0b` (アンバー) | フォーカス |
| 背景 | グラデーション | ティール → ホワイト → アンバー |
| テキスト | `#1f2937` | 見出し |
| サブテキスト | `#6b7280` | 説明文 |

### タイポグラフィ

- **見出し**: 1.5rem (24px), font-weight: 700
- **ラベル**: 0.875rem (14px), font-weight: 500
- **入力フィールド**: 1rem (16px)
- **ボタン**: 1rem (16px), font-weight: 500

### レイアウト

- **最大幅**: 28rem (448px)
- **パディング**: 2rem (32px)
- **ボーダー半径**: 0.5rem (8px)
- **シャドウ**: 0 10px 15px -3px rgba(0, 0, 0, 0.1)

## カスタマイズ方法

### CSSファイルの編集

`infra/modules/cognito/hosted-ui.css`を編集：

```css
/* プライマリカラーを変更 */
.submitButton-customizable {
  background-color: #14b8a6 !important;
}

/* ホバーカラーを変更 */
.submitButton-customizable:hover {
  background-color: #505050 !important;
}
```

### ロゴの追加

1. ロゴ画像を準備（推奨: PNG, 最大100KB）
2. Terraformで指定：

```hcl
module "cognito" {
  # ...
  ui_logo_file = "${path.module}/../../assets/logo.png"
}
```

### デプロイ

```bash
cd infra/environments/production
terraform apply
```

## Hosted UIのURL構造

### ログインページ

```
https://feed-bower-production.auth.ap-northeast-1.amazoncognito.com/login
  ?client_id=<CLIENT_ID>
  &response_type=code
  &redirect_uri=https://www.feed-bower.net
```

### サインアップページ

```
https://feed-bower-production.auth.ap-northeast-1.amazoncognito.com/signup
  ?client_id=<CLIENT_ID>
  &response_type=code
  &redirect_uri=https://www.feed-bower.net
```

### パスワードリセット

```
https://feed-bower-production.auth.ap-northeast-1.amazoncognito.com/forgotPassword
  ?client_id=<CLIENT_ID>
  &response_type=code
  &redirect_uri=https://www.feed-bower.net
```

## カスタマイズ可能な要素

### CSSクラス

| クラス名 | 説明 |
|---------|------|
| `.banner-customizable` | ヘッダーバナー |
| `.logo-customizable` | ロゴ画像 |
| `.textDescription-customizable` | タイトルテキスト |
| `.inputField-customizable` | 入力フィールド |
| `.submitButton-customizable` | 送信ボタン |
| `.redirect-customizable` | リンク |
| `.errorMessage-customizable` | エラーメッセージ |
| `.successMessage-customizable` | 成功メッセージ |

### レスポンシブデザイン

```css
@media (max-width: 640px) {
  .modal-content {
    padding: 1.5rem;
    margin: 1rem;
  }
}
```

## テスト方法

### ローカルでのプレビュー

CSSファイルを編集後、ブラウザの開発者ツールで確認：

1. Hosted UIにアクセス
2. 開発者ツールを開く (F12)
3. Elements タブでCSSを確認
4. Styles パネルで調整

### 本番環境での確認

```bash
# デプロイ
terraform apply

# Hosted UIにアクセス
open "https://feed-bower-production.auth.ap-northeast-1.amazoncognito.com/login?client_id=<CLIENT_ID>&response_type=code&redirect_uri=https://www.feed-bower.net"
```

## トラブルシューティング

### CSSが反映されない

1. **キャッシュをクリア**
   - ブラウザのキャッシュをクリア
   - Shift + F5 でハードリロード

2. **Terraformで再デプロイ**
   ```bash
   terraform taint module.cognito.aws_cognito_user_pool_ui_customization.ui[0]
   terraform apply
   ```

3. **CSSの構文エラーを確認**
   - CSSバリデーターでチェック
   - `!important`を使用して優先度を上げる

### ロゴが表示されない

1. **ファイルサイズを確認**
   - 最大100KB
   - PNG, JPG, GIF形式

2. **Base64エンコードを確認**
   ```bash
   base64 -i logo.png | wc -c
   ```

3. **Terraformで確認**
   ```bash
   terraform state show module.cognito.aws_cognito_user_pool_ui_customization.ui[0]
   ```

## ベストプラクティス

1. **シンプルに保つ**
   - 過度なカスタマイズは避ける
   - ブランドカラーとロゴに集中

2. **アクセシビリティ**
   - コントラスト比を確保 (WCAG AA: 4.5:1)
   - フォーカス状態を明確に

3. **モバイルファースト**
   - レスポンシブデザインを優先
   - タッチターゲットを十分に大きく (44x44px)

4. **パフォーマンス**
   - CSSを最小化
   - 不要なスタイルを削除

## 参考リンク

- [AWS Cognito - UI Customization](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-ui-customization.html)
- [Terraform - aws_cognito_user_pool_ui_customization](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_ui_customization)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
