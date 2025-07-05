# Difyチャット設定ガイド

## 📋 目次

1. [Difyとは](#difyとは)
2. [Difyチャットボットの作成](#difyチャットボットの作成)
3. [公開設定とプライベート設定](#公開設定とプライベート設定)
4. [本システムでの連携方法](#本システムでの連携方法)
5. [セキュリティ設定](#セキュリティ設定)
6. [トラブルシューティング](#トラブルシューティング)

## 🤖 Difyとは

[Dify](https://dify.ai/) は、LLMアプリケーションの開発・デプロイプラットフォームです。チャットボット、エージェント、AIワークフローを簡単に作成できます。

### 主な特徴

- ノーコード/ローコードでAIアプリ開発
- 複数のLLMモデルに対応（GPT、Claude、LLaMA等）
- プロンプトエンジニアリング機能
- APIとWebチャット両方の提供

## 🚀 Difyチャットボットの作成

### ステップ1: Difyアカウントの作成

1. [Dify.ai](https://dify.ai/) にアクセス
2. 「Get Started」または「Sign Up」をクリック
3. メールアドレスまたはGitHub/Googleアカウントで登録

### ステップ2: 新規アプリケーションの作成

1. ダッシュボードで「Create Application」をクリック
2. アプリケーションタイプを選択：
   - **Chatbot**: 対話型チャット（推奨）
   - **Text Generation**: テキスト生成
   - **Agent**: エージェント型
   - **Workflow**: ワークフロー型

### ステップ3: チャットボットの設定

```yaml
# 基本設定例
アプリ名: Customer Support Chat
説明: LIFFアプリ用のカスタマーサポートチャット
モデル: GPT-3.5 または Claude
```

### ステップ4: プロンプト設定

```
システムプロンプト例:
あなたは親切で丁寧なカスタマーサポートアシスタントです。
ユーザーの質問に対して、分かりやすく具体的に回答してください。
技術的な内容も、初心者に理解できるように説明してください。
```

## 🔒 公開設定とプライベート設定

### 方法1: アクセス制限付きWeb App（推奨）

Difyでは、チャットボットのアクセスを制限する複数の方法があります：

#### 1. パスワード保護

1. アプリケーション設定で「Publish」をクリック
2. 「Access Control」セクションで設定：

```yaml
Access Control:
  Type: Password Protected
  Password: your-secure-password
```

#### 2. ドメイン制限

```yaml
Access Control:
  Type: Domain Restriction
  Allowed Domains:
    - your-domain.com
    - *.your-domain.com
```

#### 3. カスタムドメイン（有料プラン）

```yaml
Custom Domain:
  Domain: chat.your-domain.com
  SSL: Enabled
```

### 方法2: API経由でのアクセス（最もセキュア）

APIを使用することで、完全にプライベートなチャットを実現できます：

```javascript
// Dify API を使用した実装例
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1';

async function sendMessageToDify(message, conversationId) {
  const response = await axios.post(
    `${DIFY_API_URL}/chat-messages`,
    {
      inputs: {},
      query: message,
      user: userId,
      conversation_id: conversationId,
      response_mode: 'blocking'
    },
    {
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

### 方法3: iframe埋め込み with 認証

本システムで採用している方法：

```javascript
// 1. Difyでチャットを作成（非公開設定）
// 2. Web App URLを取得（例: https://udify.app/chatbot/xxxx）
// 3. JWTで保護されたプロキシ経由でアクセス

// プロキシエンドポイント（/chat-proxy）
app.get('/chat-proxy', async (req, res) => {
  // JWT検証
  const token = req.query.token;
  const decoded = verifyJWT(token);
  
  if (decoded.isPaid) {
    // Difyチャットを取得して返す
    const chatHtml = await fetchDifyChat();
    res.send(chatHtml);
  }
});
```

## 🔧 本システムでの連携方法

### 環境変数の設定

```env
# Dify Web App URL（公開されていないURL）
DIFY_CHAT_URL=https://udify.app/chatbot/your-unique-id

# API使用の場合（オプション）
DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxx
DIFY_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### URLの取得方法

1. Difyダッシュボードでアプリを開く
2. 「Publish」または「Preview」をクリック
3. Web App URLをコピー：

```
形式: https://udify.app/chatbot/[unique-id]
例: https://udify.app/chatbot/a1b2c3d4e5f6
```

### プライベートURL設定のベストプラクティス

1. **URLの推測困難性**
   - Difyが生成するユニークIDは十分ランダム
   - 追加でカスタムパラメータを付与可能

2. **アクセス制御の多層防御**
   ```javascript
   // レイヤー1: JWT認証（本システム）
   // レイヤー2: Difyのパスワード保護
   // レイヤー3: IPアドレス制限（オプション）
   ```

3. **定期的なURL変更**
   - セキュリティのため、定期的にチャットボットを再作成
   - URLローテーションの実装

## 🛡️ セキュリティ設定

### 1. Dify側のセキュリティ設定

```yaml
Security Settings:
  # データ保持
  Data Retention: 7 days
  
  # ログ設定
  Log Level: Error only
  
  # レート制限
  Rate Limit: 100 requests/hour
  
  # CORS設定
  Allowed Origins:
    - https://your-domain.com
```

### 2. プロキシ側の追加セキュリティ

```javascript
// IPアドレス制限の追加
const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];

app.get('/chat-proxy', (req, res, next) => {
  const clientIP = req.ip;
  
  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
});

// リファラーチェック
app.get('/chat-proxy', (req, res, next) => {
  const referer = req.headers.referer;
  const allowedReferers = ['https://your-domain.com'];
  
  if (!allowedReferers.some(allowed => referer?.startsWith(allowed))) {
    return res.status(403).json({ error: 'Invalid referer' });
  }
  
  next();
});
```

### 3. コンテンツの動的修正

```javascript
// Difyチャットのコンテンツを修正
app.get('/chat-proxy', async (req, res) => {
  const chatHtml = await fetchDifyChat();
  
  // セキュリティヘッダーの追加
  const modifiedHtml = chatHtml
    .replace('<head>', `<head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://udify.app;">
      <meta name="robots" content="noindex, nofollow">
    `);
  
  res.send(modifiedHtml);
});
```

## 🔧 高度な実装パターン

### パターン1: API完全統合

```javascript
// Dify APIを完全に統合し、独自UIを提供
class DifyIntegration {
  constructor(apiKey, appId) {
    this.apiKey = apiKey;
    this.appId = appId;
    this.baseURL = 'https://api.dify.ai/v1';
  }

  async createConversation(userId) {
    const response = await axios.post(
      `${this.baseURL}/conversations`,
      {
        app_id: this.appId,
        user: userId
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );
    
    return response.data.id;
  }

  async sendMessage(message, conversationId, userId) {
    const response = await axios.post(
      `${this.baseURL}/chat-messages`,
      {
        inputs: {},
        query: message,
        user: userId,
        conversation_id: conversationId,
        response_mode: 'streaming' // or 'blocking'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );
    
    return response.data;
  }

  async getConversationHistory(conversationId) {
    const response = await axios.get(
      `${this.baseURL}/conversations/${conversationId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );
    
    return response.data;
  }
}

// 使用例
const dify = new DifyIntegration(
  process.env.DIFY_API_KEY,
  process.env.DIFY_APP_ID
);

app.post('/api/chat', async (req, res) => {
  const { message, conversationId } = req.body;
  const userId = req.user.id; // JWTから取得
  
  try {
    const response = await dify.sendMessage(
      message,
      conversationId,
      userId
    );
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Chat service error' });
  }
});
```

### パターン2: ハイブリッドアプローチ

```javascript
// 初期表示はiframe、その後APIで通信
class HybridDifyChat {
  constructor() {
    this.useAPI = process.env.DIFY_API_KEY ? true : false;
  }

  async initialize(userId) {
    if (this.useAPI) {
      // API経由で初期化
      return await this.initializeAPI(userId);
    } else {
      // iframe用のURLを返す
      return {
        type: 'iframe',
        url: `/chat-proxy?token=${generateJWT({ userId })}`
      };
    }
  }

  async initializeAPI(userId) {
    const conversationId = await dify.createConversation(userId);
    return {
      type: 'api',
      conversationId,
      apiEndpoint: '/api/chat'
    };
  }
}
```

## 🚨 トラブルシューティング

### 問題1: チャットが表示されない

**原因と解決策:**

1. **URL が間違っている**
   ```bash
   # 環境変数の確認
   echo $DIFY_CHAT_URL
   # 正しい形式: https://udify.app/chatbot/xxxx
   ```

2. **Difyアプリが公開されていない**
   - Difyダッシュボードで「Publish」をクリック
   - Web App を有効化

3. **CORS エラー**
   ```javascript
   // CORSヘッダーの追加
   app.use((req, res, next) => {
     res.header('X-Frame-Options', 'SAMEORIGIN');
     next();
   });
   ```

### 問題2: 認証エラー

**チェックポイント:**

- [ ] JWT トークンが有効か
- [ ] Dify のアクセス制限設定
- [ ] プロキシのエラーログ確認

### 問題3: レスポンスが遅い

**最適化方法:**

1. **キャッシュの実装**
   ```javascript
   const cache = new Map();
   
   app.get('/chat-proxy', async (req, res) => {
     const cacheKey = 'dify-chat-html';
     
     if (cache.has(cacheKey)) {
       return res.send(cache.get(cacheKey));
     }
     
     const html = await fetchDifyChat();
     cache.set(cacheKey, html);
     
     // 5分後にキャッシュクリア
     setTimeout(() => cache.delete(cacheKey), 300000);
     
     res.send(html);
   });
   ```

2. **CDN の活用**
   - 静的リソースをCDN配信
   - エッジロケーションの活用

## 📚 参考リンク

- [Dify公式ドキュメント](https://docs.dify.ai/)
- [Dify API リファレンス](https://docs.dify.ai/api-reference)
- [Difyコミュニティ](https://discord.gg/dify)

## 💡 ベストプラクティスまとめ

1. **セキュリティファースト**
   - 公開URLは使用しない
   - 多層防御を実装
   - 定期的なセキュリティ監査

2. **パフォーマンス最適化**
   - 適切なキャッシング
   - 非同期処理の活用
   - エラーハンドリングの徹底

3. **ユーザー体験**
   - スムーズな読み込み
   - エラー時の適切なフィードバック
   - レスポンシブデザイン

4. **保守性**
   - 環境変数での設定管理
   - ログの適切な記録
   - ドキュメントの整備

---

**最終更新**: 2024年1月  
**バージョン**: 1.0.0  
**関連ドキュメント**: [README.md](./README.md), [GUIDELINE.md](./GUIDELINE.md)