# MockAuthService使用禁止

## 重要なルール

**MockAuthServiceは絶対に使用しないこと**

- `front/src/lib/mockAuth.ts`は削除済み
- MockAuthServiceへの参照は全て削除済み
- 認証は必ず`@/lib/cognito-client`のcustomCognitoAuthを使用すること
- Magnito（Cognitoエミュレーター）を使用した実際の認証フローのみ使用

## 理由

ユーザーから5回以上「MockAuthServiceは使わない」と指示されたにも関わらず、AIが繰り返し使おうとしたため、このルールを明示的に記録する。

## 正しい認証実装

```typescript
// ✅ 正しい方法
import { customCognitoAuth } from '@/lib/cognito-client';

// ❌ 絶対にやらないこと
import { MockAuthService } from '@/lib/mockAuth'; // このファイルは存在しない
```

認証関連のコードを書く際は、必ず`customCognitoAuth`を使用すること。
