# LIFF Chat Service with JWT Authentication

LINE LIFF（LINE Front-end Framework）を使用した認証システムと、JWTトークンベースのチャットプロキシサービスの実装例です。

> 📚 **関連ドキュメント**
> - [LINE_SETUP_GUIDE.md](./LINE_SETUP_GUIDE.md) - LINE Developersの設定方法
> - [JWT_GUIDE.md](./JWT_GUIDE.md) - JWTの詳細解説
> - [DIFY_SETUP_GUIDE.md](./DIFY_SETUP_GUIDE.md) - Difyチャットの設定方法
> - [GUIDELINE.md](./GUIDELINE.md) - 開発・運用ガイドライン
> - [FLOWCHART.md](./FLOWCHART.md) - システムフロー図

## 📋 概要

このシステムは以下の機能を提供します：

1. **LIFF認証**: LINE IDトークンを使用したユーザー認証
2. **課金状態確認**: データベースと連携したユーザーの課金状態チェック
3. **JWT発行**: 認証済みユーザーへの短期有効JWTトークン発行
4. **チャットプロキシ**: JWTトークンを検証し、Difyチャットサービスへのプロキシアクセス

## 🔧 技術スタック

- **バックエンド**:
  - Node.js (14以降)
  - Express.js
  - jsonwebtoken
  - axios
  - cors, helmet (セキュリティ)
  - express-rate-limit (レート制限)

- **フロントエンド**:
  - LINE LIFF SDK
  - Vanilla JavaScript
  - レスポンシブCSS

## 📁 プロジェクト構成

```
claude-liff-auth/
├── index.js           # メインサーバーファイル
├── package.json       # プロジェクト設定とdependencies
├── .env.example       # 環境変数のテンプレート
├── public/            # 静的ファイルディレクトリ
│   └── index.html     # LIFFフロントエンド
└── README.md          # このファイル
```

## 🚀 セットアップ方法

### 1. プロジェクトのクローンまたはダウンロード

```bash
git clone <repository-url>
cd claude-liff-auth
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example` を `.env` にコピーして、必要な値を設定します：

```bash
cp .env.example .env
```

#### JWT_SECRET の生成

JWT_SECRET は強力なランダム文字列である必要があります。以下のコマンドで生成できます：

```bash
# Node.js を使用した生成（推奨）
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# または OpenSSL を使用
openssl rand -hex 64
```

#### 環境変数の設定

生成した値を含めて、以下の環境変数を設定してください：

```env
# LINE LIFF Configuration（LINE Developersコンソールから取得）
LINE_CHANNEL_ID=your_line_channel_id_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here
LINE_LIFF_ID=your_liff_id_here

# JWT Configuration
JWT_SECRET=生成した64文字以上のランダム文字列をここに貼り付け
JWT_EXPIRES_IN=5m

# Server Configuration
PORT=3000
NODE_ENV=production

# Dify Chat Configuration
DIFY_CHAT_URL=https://udify.app/chatbot/xxxx
```

> 💡 **ヒント**: 
> - LINE関連のID取得方法は [LINE_SETUP_GUIDE.md](./LINE_SETUP_GUIDE.md) を参照
> - JWTの詳細は [JWT_GUIDE.md](./JWT_GUIDE.md) を参照
> - Difyチャットの設定方法は [DIFY_SETUP_GUIDE.md](./DIFY_SETUP_GUIDE.md) を参照

### 4. LIFF IDの設定

`public/index.html` 内の LIFF ID を実際の値に置き換えます：

```javascript
const CONFIG = {
    liffId: 'YOUR_ACTUAL_LIFF_ID', // ← ここを変更
    // ...
};
```

### 5. データベース接続の実装（オプション）

`index.js` の `checkPaymentStatus` 関数内で、実際のデータベース照合ロジックを実装してください：

```javascript
async function checkPaymentStatus(userId) {
    // TODO: 実際のデータベース照合処理を実装
    // 現在は全ユーザーを課金済みとして扱っています
}
```

データベースを使用する場合は、`.env` ファイルに以下を追加：

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=liff_auth
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

> 💡 **注**: 開発・デモ環境ではデータベースなしでも動作します。本番環境での課金管理にはデータベースまたは外部APIの実装が必要です。

## 🏃‍♂️ 実行方法

### 開発環境での実行

```bash
# 通常起動
npm start

# nodemonを使用した自動リロード起動
npm run dev
```

### 本番環境での実行

```bash
NODE_ENV=production npm start
```

### PM2を使用した実行（推奨）

```bash
# PM2のインストール
npm install -g pm2

# アプリケーションの起動
pm2 start index.js --name "liff-chat-service"

# ログの確認
pm2 logs liff-chat-service
```

## 📍 エンドポイント

### 1. ヘルスチェック

```
GET /health
```

**レスポンス例:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345.678
}
```

### 2. 認証エンドポイント

```
POST /auth
Content-Type: application/json

{
  "idToken": "LINE_ID_TOKEN_HERE"
}
```

**成功レスポンス例:**
```json
{
  "success": true,
  "token": "JWT_TOKEN_HERE",
  "expiresIn": "5m",
  "user": {
    "id": "U1234567890abcdef",
    "name": "山田太郎",
    "isPaid": true
  }
}
```

**エラーレスポンス例:**
```json
{
  "error": "Forbidden",
  "message": "Chat service is available for paid users only",
  "isPaid": false
}
```

### 3. チャットプロキシ

```
GET /chat-proxy?token=JWT_TOKEN_HERE
```

**レスポンス:**
- 成功時: Difyチャットの HTML コンテンツ
- エラー時: エラーページの HTML

### 4. 静的ファイル（LIFF フロントエンド）

```
GET /
```

## 🔐 JWTトークン構成

発行されるJWTトークンには以下の情報が含まれます：

- **userId**: LINE ユーザーID
- **userName**: ユーザー名
- **isPaid**: 課金状態（boolean）
- **permissions**: アクセス権限の配列（例: `["chat_access"]`）
- **jti**: JWT ID（ユニーク識別子）
- **iat**: 発行時刻（Unix timestamp）
- **exp**: 有効期限（Unix timestamp）
- **iss**: 発行者（`claude-liff-auth`）

## 🧪 テスト方法

### 1. ローカル環境でのテスト

1. 環境変数が正しく設定されているか確認
   ```bash
   # 設定確認（値は表示せず、設定の有無のみ確認）
   node -e "['LINE_CHANNEL_ID','LINE_CHANNEL_SECRET','LINE_LIFF_ID','JWT_SECRET'].forEach(k => console.log(k + ':', process.env[k] ? '✓ Set' : '✗ Not set'))"
   ```

2. サーバーを起動
   ```bash
   npm start
   ```

3. ブラウザで `http://localhost:3000` にアクセス
4. LINEでログイン
5. チャット認証ボタンをクリック
6. チャットが表示されることを確認

### 2. cURLを使用したAPIテスト

```bash
# ヘルスチェック
curl http://localhost:3000/health

# 認証テスト（実際のIDトークンが必要）
curl -X POST http://localhost:3000/auth \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_LINE_ID_TOKEN"}'

# チャットプロキシテスト
curl "http://localhost:3000/chat-proxy?token=YOUR_JWT_TOKEN"
```

### 3. LINE開発者コンソールでのLIFF設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. チャンネルを選択または作成
3. LIFF タブで新規 LIFF アプリを作成
4. エンドポイント URL に `https://your-domain.com/` を設定
5. LIFF ID をコピーして環境変数に設定

## 🛡️ セキュリティ対策

本実装には以下のセキュリティ対策が含まれています：

1. **CORS制限**: 許可されたオリジンのみアクセス可能
2. **レート制限**: 認証エンドポイントへの過剰なリクエストを防止
3. **Helmetミドルウェア**: 各種セキュリティヘッダーの自動設定
4. **JWT有効期限**: 短期間（5分）の有効期限設定
5. **HTTPS推奨**: 本番環境ではHTTPS使用を強く推奨

### セキュリティのベストプラクティス

- **JWT_SECRET**: 必ず強力なランダム文字列を使用し、Gitにコミットしない
- **環境変数**: 本番環境の値は安全に管理し、開発環境と分離する
- **定期的な更新**: JWT_SECRETは定期的に更新することを推奨

## 🐛 トラブルシューティング

### LIFF初期化エラー

- LIFF IDが正しく設定されているか確認
- HTTPSで動作しているか確認（開発時はlocalhostでも可）
- LINE Developersコンソールでエンドポイント URLが正しく設定されているか確認

### 認証エラー

- LINE IDトークンの有効期限が切れていないか確認
- 環境変数 `LINE_CHANNEL_ID` が正しく設定されているか確認
- ネットワーク接続を確認

### チャット表示エラー

- JWTトークンの有効期限を確認
- `DIFY_CHAT_URL` が正しく設定されているか確認
- CORSエラーが発生していないか開発者ツールで確認

## 📚 参考リンク

- [LINE LIFF Documentation](https://developers.line.biz/ja/docs/liff/)
- [Express.js Documentation](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストは歓迎します。大きな変更の場合は、まずイシューを開いて変更内容について議論してください。