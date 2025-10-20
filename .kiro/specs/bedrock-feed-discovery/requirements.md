# 要件定義書

## はじめに

この機能は、Amazon Bedrock Agent Coreを統合して、ユーザーが提供するキーワードに基づいてAI駆動のRSS/Atomフィード検索を提供します。システムは、Claude 3 Haikuモデルを使用して関連性の高い高品質なフィードを自動的に見つけ、Bedrockが利用できない場合は静的キーワードマッピングへのフォールバック機構を備えています。

## 用語集

- **Bedrock Agent**: AI駆動のフィード検索を調整するAmazon Bedrock Agent Coreサービス
- **Feed Service**: フィード管理と推奨を担当するバックエンドサービス
- **Action Group**: 利用可能なアクション（フィード検索）を定義するBedrock Agentコンポーネント
- **Lambda Executor**: フィード検索アクションを実行するAWS Lambda関数
- **Feed Database**: メタデータを含む厳選されたRSS/Atomフィードのコレクション
- **Relevance Score**: フィードがキーワードにどの程度一致するかを示す数値（0-1）
- **Fallback Mechanism**: Bedrock Agentが利用できない場合に使用される静的キーワードマッピング

## 要件

### 要件1

**ユーザーストーリー:** ユーザーとして、自分の興味に基づいて関連するRSSフィードを自動的に見つけてほしい。手動で検索することなく、質の高いコンテンツソースを素早く発見できるようにするため。

#### 受け入れ基準

1. ユーザーがキーワードを提供したとき、Feed ServiceはBedrock Agentを呼び出して関連フィードを検索すること
2. Bedrock Agentは0から1の間の関連度スコアを持つフィードを返すこと
3. Feed Serviceはリクエストごとに最低1件、最大10件のフィードを返すこと
4. キーワードが日本語または英語で提供された場合、Bedrock Agentは一致する言語のフィードを優先すること
5. Feed Serviceは推奨リクエストを10秒以内に完了すること

### 要件2

**ユーザーストーリー:** システム管理者として、Bedrockの障害を適切に処理してほしい。AIサービスが利用できない場合でも、ユーザーが常に推奨を受け取れるようにするため。

#### 受け入れ基準

1. Bedrock Agentの呼び出しが失敗した場合、Feed Serviceは自動的に静的キーワードマッピングのフォールバックを使用すること
2. Feed ServiceはBedrockの障害を適切なエラー詳細とともにログに記録すること
3. Feed Serviceはフォールバック機構から2秒以内に推奨を返すこと
4. フォールバックを使用する場合、Feed Serviceはログに静的マッピングが使用されたことを示すこと
5. Feed ServiceはBedrockのエラーをエンドユーザーに公開しないこと

### 要件3

**ユーザーストーリー:** 開発者として、Bedrock Agentインフラストラクチャをterraformでデプロイしてほしい。セットアップが再現可能でバージョン管理されるようにするため。

#### 受け入れ基準

1. TerraformモジュールはClaude 3 HaikuモデルでBedrock Agentを作成すること
2. Terraformモジュールはフィード検索アクショングループ用のLambda関数を作成すること
3. Terraformモジュールは最小権限の原則でIAMロールを設定すること
4. Terraformモジュールは本番環境用のBedrock Agentエイリアスを作成すること
5. Terraformモジュールはバックエンド設定用にAgent IDとAlias IDを出力すること

### 要件4

**ユーザーストーリー:** システムとして、厳選されたフィードデータベースを維持してほしい。Lambda executorが高品質で検証済みのフィードソースを返せるようにするため。

#### 受け入れ基準

1. Feed Databaseは少なくとも20件の検証済みRSS/Atomフィードを含むこと
2. Feed Databaseは日本語と英語の両方のフィードを含むこと
3. Feed Databaseはタイトル、説明、カテゴリ、言語、タグを含むメタデータを保存すること
4. Feed DatabaseはLambdaデプロイパッケージ内にJSONとして保存されること
5. Feed DatabaseはBedrock Agentを再デプロイせずに更新可能であること

### 要件5

**ユーザーストーリー:** ユーザーとして、フィード推奨を関連度でランク付けしてほしい。最も適切なフィードが最初に表示されるようにするため。

#### 受け入れ基準

1. Lambda Executorはタイトル、説明、カテゴリ、タグのキーワードマッチに基づいて関連度スコアを計算すること
2. Lambda Executorはタイトルマッチに0.4、説明マッチに0.3、カテゴリマッチに0.2、タグマッチに0.1の重みを割り当てること
3. Lambda Executorはフィード言語が優先言語と一致しない場合、関連度を30%減少させること
4. Lambda Executorは関連度スコアの降順で結果をソートすること
5. Lambda Executorは関連度スコアが0より大きいフィードのみを返すこと

### 要件6

**ユーザーストーリー:** 開発者として、Bedrock統合全体で包括的なログを記録してほしい。問題のトラブルシューティングとパフォーマンス監視ができるようにするため。

#### 受け入れ基準

1. Feed ServiceはBedrock Agentが呼び出されたときにキーワード詳細とともにログを記録すること
2. Feed ServiceはBedrockから受信した推奨の数をログに記録すること
3. Lambda Executorはパラメータを含むすべての受信リクエストをログに記録すること
4. Lambda Executorは各フィード候補のマッチング詳細をログに記録すること
5. Feed ServiceはBedrockとフォールバック機構の両方のレスポンス時間をログに記録すること

### 要件7

**ユーザーストーリー:** システム管理者として、バックエンドが環境変数による設定をサポートしてほしい。コード変更なしで異なる環境にデプロイできるようにするため。

#### 受け入れ基準

1. Backendは環境変数からBEDROCK_AGENT_IDを読み取ること
2. Backendはデフォルト値"production"で環境変数からBEDROCK_AGENT_ALIASを読み取ること
3. Backendはデフォルト値"ap-northeast-1"で環境変数からBEDROCK_REGIONを読み取ること
4. BEDROCK_AGENT_IDが空の場合、Feed Serviceはフォールバック機構のみを使用すること
5. Backendは起動時に環境変数を検証し、設定ステータスをログに記録すること

### 要件8

**ユーザーストーリー:** 開発者として、Lambda関数が入力パラメータを検証してほしい。無効なリクエストが明確なエラーメッセージで拒否されるようにするため。

#### 受け入れ基準

1. Lambda Executorはkeywordsパラメータが欠落している場合、エラー400を返すこと
2. Lambda Executorはkeywords配列が空の場合、エラー400を返すこと
3. Lambda Executorはkeywordsを配列または単一文字列として受け入れること
4. Lambda Executorはlimitパラメータが1から10の間であることを検証すること
5. Lambda Executorはlanguageパラメータが"ja"または"en"であることを検証すること
