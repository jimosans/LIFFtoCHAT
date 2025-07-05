# LINE開発者アカウント設定ガイド

## 📋 目次

1. [LINE Developersアカウント作成](#line-developersアカウント作成)
2. [プロバイダーの作成](#プロバイダーの作成)
3. [LINEログインチャンネルの作成](#lineログインチャンネルの作成)
4. [LIFFアプリケーションの作成](#liffアプリケーションの作成)
5. [必要なID・キーの取得方法](#必要なidキーの取得方法)
6. [本番環境への移行](#本番環境への移行)
7. [トラブルシューティング](#トラブルシューティング)

## 🚀 LINE Developersアカウント作成

### ステップ1: LINE Developersへアクセス

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 「ログイン」をクリック

### ステップ2: LINEアカウントでログイン

1. 既存のLINEアカウントでログイン
   - メールアドレスとパスワード
   - またはQRコードでログイン
2. 初回ログイン時は開発者情報の登録が必要
   - 名前（必須）
   - メールアドレス（必須）
   - 開発者契約への同意

### ステップ3: 開発者アカウントの確認

```
✅ 開発者名
✅ メールアドレス
✅ アカウントタイプ（個人/法人）
```

## 🏢 プロバイダーの作成

### ステップ1: 新規プロバイダー作成

1. コンソールホームで「新規プロバイダー作成」をクリック
2. プロバイダー名を入力（例: "My Chat Service"）
   - 英数字とスペースのみ使用可能
   - 後から変更可能

### ステップ2: プロバイダー設定

```
プロバイダー名: My Chat Service
プロバイダーID: 自動生成される（変更不可）
作成日時: 2024-01-01 12:00:00
```

## 📱 LINEログインチャンネルの作成

### ステップ1: チャンネル作成

1. プロバイダーページで「新規チャンネル作成」
2. チャンネルの種類で「LINEログイン」を選択

### ステップ2: チャンネル基本設定

```
チャンネル名: LIFF Chat Service
チャンネル説明: LIFFを使用したチャットサービス
アプリタイプ: ウェブアプリ
```

### ステップ3: 必須設定項目

| 項目 | 設定内容 | 備考 |
|------|----------|------|
| チャンネル名 | LIFF Chat Service | ユーザーに表示される |
| チャンネル説明 | チャットサービスへのログイン | 認証時に表示 |
| アプリタイプ | ウェブアプリ | LIFF用は必ずこれ |
| メールアドレス | your-email@example.com | 通知用 |

### ステップ4: チャンネル作成完了

作成後、以下の情報が自動生成されます：

```
✅ チャンネルID（Channel ID）
✅ チャンネルシークレット（Channel Secret）
✅ チャンネルアクセストークン（後で設定）
```

## 🖥️ LIFFアプリケーションの作成

### ステップ1: LIFF追加

1. LINEログインチャンネルの「LIFF」タブを開く
2. 「追加」ボタンをクリック

### ステップ2: LIFF設定

```javascript
// LIFF設定例
{
  "liffId": "1234567890-abcdefgh",  // 自動生成
  "view": {
    "type": "full",                  // full, tall, compact
    "url": "https://your-domain.com" // 必須
  },
  "features": {
    "ble": false,                    // Bluetooth
    "qrCodeReader": false            // QRコードリーダー
  }
}
```

### ステップ3: LIFF詳細設定

| 設定項目 | 推奨値 | 説明 |
|----------|--------|------|
| LIFFアプリ名 | Chat Service | 管理用の名前 |
| サイズ | Full | 全画面表示 |
| エンドポイントURL | https://your-domain.com | 本番URL |
| Scope | profile, openid | 必要な権限 |
| ボットリンク機能 | Off | チャットには不要 |
| Scan QR | Off | 不要な場合 |
| モジュールモード | Off | 通常はOff |

### ステップ4: 開発用URL設定（オプション）

開発時はlocalhostも使用可能：

```
開発用エンドポイントURL: https://localhost:3000
```

**注意**: 
- HTTPSが必須（開発環境でも）
- localhostの場合は自己署名証明書でもOK

## 🔑 必要なID・キーの取得方法

### 1. Channel ID（LINE_CHANNEL_ID）

**取得場所**: LINEログインチャンネル > 「チャンネル基本設定」タブ

```
Channel ID: 1234567890
```

![Channel ID Location]
```
LINEログインチャンネル
└─ チャンネル基本設定
   └─ チャンネル情報
      └─ Channel ID: 1234567890 [コピー]
```

### 2. Channel Secret（LINE_CHANNEL_SECRET）

**取得場所**: LINEログインチャンネル > 「チャンネル基本設定」タブ

```
Channel secret: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

⚠️ **重要**: 
- 絶対に公開しない
- Gitにコミットしない
- 環境変数で管理

### 3. LIFF ID（LINE_LIFF_ID）

**取得場所**: LINEログインチャンネル > 「LIFF」タブ

```
LIFF ID: 1234567890-abcdefgh
```

![LIFF ID Location]
```
LINEログインチャンネル
└─ LIFF
   └─ LIFFアプリ一覧
      └─ Chat Service
         └─ LIFF ID: 1234567890-abcdefgh [コピー]
```

### 4. 環境変数設定例

**.env ファイル:**
```bash
# LINE Configuration
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
LINE_LIFF_ID=1234567890-abcdefgh

# その他の設定
JWT_SECRET=your-super-secret-jwt-key-here
DIFY_CHAT_URL=https://udify.app/chatbot/xxxx
PORT=3000
```

## 🔧 LIFF設定の詳細オプション

### Scope（権限）設定

LIFFで利用可能なScope：

| Scope | 説明 | 必要性 |
|-------|------|--------|
| profile | ユーザープロフィール取得 | ✅ 必須 |
| openid | IDトークン取得 | ✅ 必須 |
| email | メールアドレス取得 | ⚪ オプション |

### 設定方法

1. LINEログインチャンネル > 「チャンネル基本設定」
2. 「OpenID Connect」セクション
3. 必要なScopeにチェック

```javascript
// フロントエンドでの確認
liff.init({ liffId: 'YOUR_LIFF_ID' }).then(() => {
  console.log('利用可能なScope:', liff.getScope());
});
```

## 🌐 本番環境への移行

### ステップ1: ドメイン設定

1. 本番ドメインをHTTPS化
2. SSL証明書の設定（Let's Encrypt推奨）

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}
```

### ステップ2: LIFF URLの更新

1. LIFF設定ページで「編集」
2. エンドポイントURLを本番URLに変更
3. 「更新」をクリック

```
開発: https://localhost:3000
  ↓
本番: https://your-domain.com
```

### ステップ3: コールバックURL設定

LINEログインチャンネル > 「LINEログイン設定」

```
コールバックURL:
https://your-domain.com/callback
https://your-domain.com/auth/line/callback
```

### ステップ4: ホワイトリスト設定（必要な場合）

IPアドレス制限を行う場合：

```
許可IPアドレス:
- 203.104.xxx.xxx
- 203.104.xxx.xxx/24
```

## 🚨 トラブルシューティング

### 問題1: 「Invalid LIFF ID」エラー

**原因と解決策:**
```javascript
// ❌ 間違い
const CONFIG = {
    liffId: 'YOUR_LIFF_ID'  // 置き換え忘れ
};

// ✅ 正しい
const CONFIG = {
    liffId: '1234567890-abcdefgh'  // 実際のLIFF ID
};
```

### 問題2: 「The LIFF ID is invalid」

**チェックリスト:**
- [ ] LIFF IDが正しくコピーされているか
- [ ] 余分なスペースが入っていないか
- [ ] チャンネルが公開状態になっているか

### 問題3: CORS エラー

**解決方法:**
1. LIFFエンドポイントURLを確認
2. HTTPSで動作しているか確認
3. ドメインが正しく設定されているか

```javascript
// サーバー側のCORS設定
const allowedOrigins = [
  'https://line.me',
  'https://liff.line.me',
  'https://your-domain.com'
];
```

### 問題4: 「Channel does not exist」

**原因:**
- Channel IDとChannel Secretの不一致
- チャンネルが削除されている
- 開発/本番の環境違い

**確認方法:**
```bash
# 環境変数の確認
echo $LINE_CHANNEL_ID
echo $LINE_CHANNEL_SECRET
```

## 📊 設定チェックリスト

### 開発開始前の確認

- [ ] LINE Developersアカウント作成完了
- [ ] プロバイダー作成完了
- [ ] LINEログインチャンネル作成完了
- [ ] Channel ID取得
- [ ] Channel Secret取得
- [ ] LIFFアプリ作成完了
- [ ] LIFF ID取得
- [ ] エンドポイントURL設定
- [ ] Scope設定（profile, openid）
- [ ] .envファイルに設定値記入
- [ ] HTTPSでのアクセス確認

### 本番移行前の確認

- [ ] 本番ドメインのSSL設定
- [ ] LIFFエンドポイントURL更新
- [ ] コールバックURL設定
- [ ] 本番用の環境変数設定
- [ ] チャンネル公開設定
- [ ] アクセス制限の確認
- [ ] ログ設定の確認
- [ ] エラー通知設定

## 🔗 参考リンク

### 公式ドキュメント
- [LINE Developers](https://developers.line.biz/)
- [LIFF ドキュメント](https://developers.line.biz/ja/docs/liff/)
- [LINEログイン ドキュメント](https://developers.line.biz/ja/docs/line-login/)
- [LIFF SDK リファレンス](https://developers.line.biz/ja/reference/liff/)

### よく使うツール
- [LIFF Playground](https://liff-playground.netlify.app/)
- [JWT.io](https://jwt.io/) - トークンのデバッグ
- [SSL Labs](https://www.ssllabs.com/ssltest/) - SSL設定確認

### コミュニティ
- [LINE API Expert](https://www.line-community.me/ja/apiexpert)
- [LINE Developers Community](https://www.line-community.me/)

## 💡 Tips & ベストプラクティス

### 1. セキュリティ

```javascript
// Channel Secretは必ず環境変数で管理
if (!process.env.LINE_CHANNEL_SECRET) {
  throw new Error('LINE_CHANNEL_SECRET is required');
}

// 本番環境では必ずHTTPS
if (process.env.NODE_ENV === 'production' && !request.secure) {
  return response.redirect('https://' + request.headers.host + request.url);
}
```

### 2. エラーハンドリング

```javascript
// LIFF初期化時の詳細なエラーハンドリング
liff.init({ liffId: CONFIG.liffId })
  .then(() => {
    console.log('LIFF初期化成功');
  })
  .catch((error) => {
    console.error('LIFF初期化エラー:', {
      code: error.code,
      message: error.message,
      liffId: CONFIG.liffId,
      url: window.location.href
    });
  });
```

### 3. デバッグ

```javascript
// 開発環境でのみデバッグ情報を表示
if (process.env.NODE_ENV === 'development') {
  console.log('LINE Config:', {
    channelId: process.env.LINE_CHANNEL_ID,
    hasSecret: !!process.env.LINE_CHANNEL_SECRET,
    liffId: process.env.LINE_LIFF_ID
  });
}
```

### 4. バージョン管理

```javascript
// package.json
{
  "dependencies": {
    "@line/liff": "^2.22.0"  // バージョンを固定
  }
}
```

---

**作成日**: 2024年1月
**最終更新**: 2024年1月
**バージョン**: 1.0.0