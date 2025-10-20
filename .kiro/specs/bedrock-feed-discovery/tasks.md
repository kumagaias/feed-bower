# 実装計画

## 概要

この実装計画は、Bedrock Agent統合を個別の管理可能なタスクに分解します。各タスクは前のステップの上に段階的に構築され、孤立したコードなしで機能が適切に統合されることを保証します。

## タスク

- [ ] 1. Lambda関数とフィードデータベースの作成
  - Lambda関数のディレクトリ構造を作成
  - Node.jsでフィード検索ハンドラーを実装
  - 20件以上のフィードを含む厳選されたフィードデータベースJSONを作成
  - 関連度スコアリングアルゴリズムを実装
  - 入力検証とエラーハンドリングを追加
  - _要件: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 2. Bedrock Agent Terraformモジュールの作成
  - Terraformモジュールのディレクトリ構造を作成
  - モジュールの変数と出力を定義
  - CloudWatch権限を持つLambda IAMロールを作成
  - Lambda関数をzipファイルとしてパッケージ化
  - Lambda関数リソースをデプロイ
  - _要件: 3.1, 3.2_

- [ ] 3. Bedrock AgentとAction Groupの設定
  - Claude 3 HaikuでBedrock Agentリソースを作成
  - フィード検索用のエージェント指示を定義
  - フィード検索アクション用のAPIスキーマを作成
  - Lambda executorでAction Groupを作成
  - モデルとLambda権限を持つBedrock Agent IAMロールを作成
  - Bedrock Agent呼び出し用のLambda権限を追加
  - Bedrock Agent用の本番エイリアスを作成
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. 本番環境へのBedrock Agent統合
  - 本番TerraformにBedrock Agentモジュールを追加
  - Lambda用の環境変数を設定
  - Lambda実行ロールにBedrock権限を追加
  - Agent IDとAlias IDを出力
  - Terraform変更を適用
  - _要件: 3.1, 3.2, 7.1, 7.2, 7.3_

- [ ] 5. Bedrock統合でFeed Serviceを更新
  - サービス設定にBedrock設定を追加
  - getFeedRecommendationsFromBedrockメソッドを実装
  - GetFeedRecommendationsを更新して最初にBedrockを試行
  - エラー時の静的マッピングへのフォールバックを実装
  - タイムアウト処理を追加（10秒）
  - Bedrockレスポンスをmodel.Feedに変換
  - _要件: 1.1, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4_

- [ ] 6. 包括的なログの追加
  - キーワード付きでBedrock呼び出しをログ記録
  - フィード数とレイテンシを含む成功レスポンスをログ記録
  - エラー詳細を含むフォールバック使用をログ記録
  - パフォーマンスメトリクスをログ記録
  - 監視用の構造化ログを追加
  - _要件: 2.2, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. 統合のデプロイとテスト
  - Bedrock変更を含むDockerイメージをビルドしてプッシュ
  - Lambda関数の更新をデプロイ
  - AWS CLI経由でBedrock Agentを直接テスト
  - API経由でフィード推奨をテスト
  - フォールバック機構が動作することを確認
  - CloudWatchログを監視
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3_

- [ ]* 8. 監視とアラートの追加
  - Bedrockメトリクス用のCloudWatchダッシュボードを作成
  - エラー率とレイテンシのアラームを設定
  - Log Insightsクエリを設定
  - 監視セットアップをドキュメント化
  - _要件: 2.2, 6.1, 6.2, 6.3, 6.4, 6.5_
