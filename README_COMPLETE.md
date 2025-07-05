# LIFF Chat Service - 完全ドキュメント

## 📑 ドキュメント一覧

本プロジェクトには以下のドキュメントが含まれています：

### 1. [README.md](./README.md)
基本的なセットアップと使用方法のガイド
- プロジェクト概要
- クイックスタート
- API仕様
- 基本的なトラブルシューティング

### 2. [GUIDELINE.md](./GUIDELINE.md)
開発・運用の詳細ガイドライン
- アーキテクチャ設計
- コーディング規約
- セキュリティベストプラクティス
- デプロイメント手順
- 監視・運用方法

### 3. [FLOWCHART.md](./FLOWCHART.md)
システムフロー図（Mermaid形式）
- 全体フロー
- 認証シーケンス
- エラーハンドリング
- データフロー

### 4. [LINE_SETUP_GUIDE.md](./LINE_SETUP_GUIDE.md)
LINE開発者アカウントの設定ガイド
- LINE Developersアカウント作成
- Channel ID/Secret の取得方法
- LIFF ID の取得方法
- 詳細な設定手順とスクリーンショット説明

### 5. [JWT_GUIDE.md](./JWT_GUIDE.md)
JWT（JSON Web Token）完全ガイド
- JWTの基本概念と構造解説
- 本システムでの実装詳細
- セキュリティベストプラクティス
- デバッグ・トラブルシューティング方法

## 🎯 プロジェクト概要

LINE LIFF（LINE Front-end Framework）を使用した認証システムと、JWTトークンベースのチャットプロキシサービスの完全な実装例です。

### 主な特徴

✅ **セキュアな認証フロー**
- LINE IDトークンによる認証
- JWT発行と自動更新
- レート制限とセキュリティヘッダー

✅ **高可用性設計**
- エラーハンドリング完備
- グレースフルシャットダウン
- ヘルスチェックエンドポイント

✅ **プロダクションレディ**
- 詳細なロギング
- 環境変数による設定管理
- Docker対応

✅ **優れたUX**
- レスポンシブデザイン
- リアルタイムステータス表示
- 分かりやすいエラーメッセージ

## 🚀 クイックスタート

### 1. 前提条件

- Node.js 14以上
- LINE Developersアカウント
- LIFF アプリケーションの作成済み

> 💡 **LINE開発者アカウントの設定が未完了の場合**  
> [LINE_SETUP_GUIDE.md](./LINE_SETUP_GUIDE.md) を参考に、LINE Channel ID、Channel Secret、LIFF ID を取得してください。

### 2. インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd claude-liff-auth

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集
```

### 3. 設定

**.env ファイル:**
```env
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_LIFF_ID=your_liff_id
JWT_SECRET=your_jwt_secret
DIFY_CHAT_URL=https://udify.app/chatbot/xxxx
```

**public/index.html の LIFF ID:**
```javascript
const CONFIG = {
    liffId: 'YOUR_LIFF_ID', // ここを変更
    // ...
};
```

### 4. 起動

```bash
# 開発環境
npm run dev

# 本番環境
NODE_ENV=production npm start
```

## 📊 システム構成

```
claude-liff-auth/
├── index.js              # Expressサーバー（認証・プロキシ）
├── public/
│   └── index.html        # LIFFフロントエンド
├── package.json          # プロジェクト設定
├── .env.example          # 環境変数テンプレート
├── .gitignore           # Git除外設定
├── README.md            # 基本ドキュメント
├── GUIDELINE.md         # 詳細ガイドライン
├── FLOWCHART.md         # フロー図
└── README_COMPLETE.md   # このファイル
```

## 🔄 処理フロー

1. **ユーザーアクセス** → LIFFページ表示
2. **LIFF初期化** → LINE認証状態確認
3. **ログイン** → LINE OAuth認証
4. **IDトークン取得** → サーバーへ送信
5. **トークン検証** → 課金状態確認
6. **JWT発行** → クライアントへ返却
7. **チャット表示** → プロキシ経由でiframe表示

## 🛡️ セキュリティ機能

- **CORS制限**: 許可されたオリジンのみ
- **レート制限**: 15分間に100リクエストまで
- **Helmet**: セキュリティヘッダー自動設定
- **JWT有効期限**: 5分（自動更新機能付き）
- **HTTPS必須**: 本番環境での暗号化通信

## 📈 パフォーマンス

- **圧縮**: gzip圧縮対応
- **キャッシング**: 静的ファイルキャッシュ
- **非同期処理**: Promise/async-await
- **エラー回復**: 自動リトライ機能

## 🔧 カスタマイズ

### データベース連携

`index.js` の `checkPaymentStatus` 関数を実装：

```javascript
async function checkPaymentStatus(userId) {
  const result = await db.query(
    'SELECT is_paid FROM users WHERE line_user_id = ?',
    [userId]
  );
  return result[0]?.is_paid || false;
}
```

### ログ出力のカスタマイズ

Winston等のロガーを追加：

```javascript
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'app.log' })
  ]
});
```

### 認証フローの拡張

追加の検証ステップを実装：

```javascript
// 2要素認証の追加
async function verify2FA(userId, code) {
  // 実装
}
```

## 🐛 デバッグ

### デバッグモードの有効化

```javascript
// public/index.html
const CONFIG = {
    debug: true, // デバッグ情報を表示
    // ...
};
```

### ログレベルの変更

```bash
LOG_LEVEL=debug npm run dev
```

### 開発ツール

- Chrome DevTools の Network タブで API 通信を確認
- Application タブで LocalStorage/SessionStorage を確認
- Console でデバッグログを確認

## 📝 よくある質問（FAQ）

**Q: LIFF初期化でエラーが発生する**
A: LIFF IDが正しいか、HTTPSで動作しているか確認してください。詳細は [LINE_SETUP_GUIDE.md](./LINE_SETUP_GUIDE.md) を参照。

**Q: LINE ID/Secret/LIFF IDの取得方法が分からない**
A: [LINE_SETUP_GUIDE.md](./LINE_SETUP_GUIDE.md) に詳細な手順を記載しています。

**Q: JWTの仕組みがよく分からない**
A: [JWT_GUIDE.md](./JWT_GUIDE.md) でJWTの基本から実装まで詳しく解説しています。

**Q: 認証後にチャットが表示されない**
A: JWTトークンの有効期限、DIFY_CHAT_URLの設定を確認してください。

**Q: CORS エラーが発生する**
A: ALLOWED_ORIGINS 環境変数に許可するオリジンを追加してください。

**Q: メモリ使用量が増加し続ける**
A: PM2のmax_memory_restartオプションで自動再起動を設定してください。

## 🤝 コントリビューション

1. Forkする
2. Feature branchを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. Branchにプッシュ (`git push origin feature/AmazingFeature`)
5. Pull Requestを作成

## 📜 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙏 謝辞

- [LINE Developers](https://developers.line.biz/)
- [Express.js](https://expressjs.com/)
- [JWT.io](https://jwt.io/)

---

**最終更新日**: 2024年1月
**バージョン**: 1.0.0
**作成者**: Claude Code Assistant