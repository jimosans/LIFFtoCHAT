# 開発・運用ガイドライン

## 📚 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [開発ガイドライン](#開発ガイドライン)
3. [コーディング規約](#コーディング規約)
4. [セキュリティガイドライン](#セキュリティガイドライン)
5. [デプロイメントガイド](#デプロイメントガイド)
6. [運用・監視](#運用監視)
7. [トラブルシューティング詳細](#トラブルシューティング詳細)
8. [パフォーマンス最適化](#パフォーマンス最適化)
9. [スケーリング戦略](#スケーリング戦略)
10. [バックアップ・リカバリ](#バックアップリカバリ)

## 🏗️ アーキテクチャ概要

### システム構成図

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  LINE LIFF   │────▶│   LINE API  │
│  (Browser)  │◀────│   Platform   │◀────│   Server    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Express   │────▶│   Database   │     │ Dify Chat   │
│   Server    │◀────│   (Future)   │     │   Service   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                          ▲
       └──────────────────────────────────────────┘
```

### レイヤー構成

1. **プレゼンテーション層**
   - LIFF フロントエンド (public/index.html)
   - レスポンシブUI
   - エラーハンドリング

2. **アプリケーション層**
   - Express.js サーバー
   - 認証ロジック
   - プロキシ機能

3. **データ層**
   - JWT トークン管理
   - 将来的なDB連携

4. **外部連携層**
   - LINE API
   - Dify Chat Service

## 💻 開発ガイドライン

### 開発環境セットアップ

1. **必要なツール**
   ```bash
   # Node.js (14以上)
   node --version

   # npm または yarn
   npm --version

   # Git
   git --version

   # エディタ（推奨: VS Code）
   ```

2. **VS Code 推奨拡張機能**
   - ESLint
   - Prettier
   - GitLens
   - Thunder Client (API テスト用)
   - Mermaid Preview

3. **開発環境の設定**
   ```bash
   # リポジトリのクローン
   git clone <repository-url>
   cd claude-liff-auth

   # 依存関係のインストール
   npm install

   # 開発用環境変数の設定
   cp .env.example .env.development
   # .env.development を編集

   # 開発サーバーの起動
   npm run dev
   ```

### ブランチ戦略

```
main
 ├── develop
 │    ├── feature/add-payment-check
 │    ├── feature/improve-ui
 │    └── feature/add-logging
 ├── staging
 └── hotfix/critical-bug
```

- **main**: 本番環境
- **develop**: 開発環境
- **staging**: ステージング環境
- **feature/***: 機能開発
- **hotfix/***: 緊急修正

### コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: フォーマット
- refactor: リファクタリング
- test: テスト
- chore: ビルド・ツール

**例:**
```
feat(auth): Add rate limiting to authentication endpoint

- Implement express-rate-limit middleware
- Set limit to 100 requests per 15 minutes
- Add custom error messages

Closes #123
```

## 📝 コーディング規約

### JavaScript/Node.js

1. **基本ルール**
   ```javascript
   // Good
   const CONFIG = {
     API_TIMEOUT: 10000,
     MAX_RETRIES: 3
   };

   // Bad
   var config = {
     timeout: 10000,
     retries: 3
   }
   ```

2. **非同期処理**
   ```javascript
   // Good - async/await を使用
   async function fetchData() {
     try {
       const result = await apiCall();
       return result;
     } catch (error) {
       logger.error('API call failed:', error);
       throw error;
     }
   }

   // Bad - コールバック地獄
   function fetchData(callback) {
     apiCall((err, result) => {
       if (err) callback(err);
       else callback(null, result);
     });
   }
   ```

3. **エラーハンドリング**
   ```javascript
   // Good - 詳細なエラー情報
   class AuthenticationError extends Error {
     constructor(message, statusCode = 401) {
       super(message);
       this.name = 'AuthenticationError';
       this.statusCode = statusCode;
     }
   }

   // Bad - 汎用的すぎるエラー
   throw new Error('Error occurred');
   ```

### HTML/CSS

1. **セマンティックHTML**
   ```html
   <!-- Good -->
   <nav class="main-navigation">
     <ul>
       <li><a href="#home">Home</a></li>
     </ul>
   </nav>

   <!-- Bad -->
   <div class="nav">
     <div class="list">
       <div><a href="#home">Home</a></div>
     </div>
   </div>
   ```

2. **CSS命名規則 (BEM)**
   ```css
   /* Good */
   .chat-container {}
   .chat-container__header {}
   .chat-container__body {}
   .chat-container--active {}

   /* Bad */
   .chat {}
   .chat-hdr {}
   .active-chat {}
   ```

## 🔒 セキュリティガイドライン

### 1. 認証・認可

```javascript
// JWTトークンの安全な生成
function generateSecureToken(payload) {
  const token = jwt.sign(
    {
      ...payload,
      jti: crypto.randomBytes(16).toString('hex'), // ユニークID
      iat: Math.floor(Date.now() / 1000),
      iss: 'claude-liff-auth'
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '5m' // 短い有効期限
    }
  );
  return token;
}
```

### 2. 入力検証

```javascript
// 入力値のサニタイゼーション
const validator = require('validator');

function validateInput(req, res, next) {
  const { idToken } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'ID token is required and must be a string'
    });
  }

  // XSS対策
  req.body.idToken = validator.escape(idToken);
  next();
}
```

### 3. セキュリティヘッダー

```javascript
// Helmet設定の詳細
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://static.line-scdn.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.line.me"],
      frameSrc: ["'self'", process.env.DIFY_CHAT_URL]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 4. 環境変数の管理

```bash
# 本番環境では必ず強力なシークレットを使用
JWT_SECRET=$(openssl rand -base64 32)

# 環境変数の暗号化
# AWS Systems Manager Parameter Store
# Azure Key Vault
# Google Secret Manager
```

### 5. 依存関係の管理

```bash
# 脆弱性チェック
npm audit

# 自動修正
npm audit fix

# 依存関係の更新
npm update

# 本番環境では--productionフラグを使用
npm ci --production
```

## 🚀 デプロイメントガイド

### 1. 本番環境の準備

```bash
# 本番用ビルド
NODE_ENV=production npm ci --production

# 環境変数の確認
node -e "console.log(Object.keys(process.env).filter(k => k.startsWith('LINE_') || k.startsWith('JWT_')))"

# ポート確認
sudo lsof -i :3000
```

### 2. PM2を使用したデプロイ

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'liff-chat-service',
    script: './index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 3. Nginx設定例

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4. Docker デプロイ

```dockerfile
# Dockerfile
FROM node:18-alpine

# セキュリティアップデート
RUN apk update && apk upgrade

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# 依存関係のコピーとインストール
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# アプリケーションファイルのコピー
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000

CMD ["node", "index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 📊 運用・監視

### 1. ロギング戦略

```javascript
// ログレベルの設定
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'liff-chat-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 構造化ログ
logger.info('User authenticated', {
  userId: decoded.userId,
  timestamp: new Date().toISOString(),
  ip: req.ip
});
```

### 2. メトリクス収集

```javascript
// Prometheus メトリクス
const promClient = require('prom-client');
const collectDefaultMetrics = promClient.collectDefaultMetrics;

collectDefaultMetrics();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// ミドルウェア
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || 'unknown', res.statusCode)
      .observe(duration / 1000);
  });
  next();
});
```

### 3. ヘルスチェック

```javascript
// 詳細なヘルスチェック
app.get('/health/detailed', async (req, res) => {
  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  // LINE API接続チェック
  try {
    await axios.get('https://api.line.me/v2/bot/info', {
      headers: { 'Authorization': `Bearer ${process.env.LINE_CHANNEL_SECRET}` },
      timeout: 5000
    });
    checks.checks.lineApi = 'ok';
  } catch (error) {
    checks.checks.lineApi = 'error';
  }

  // データベース接続チェック（将来実装時）
  // checks.checks.database = await checkDatabase();

  const allHealthy = Object.values(checks.checks).every(status => status === 'ok');
  res.status(allHealthy ? 200 : 503).json(checks);
});
```

### 4. アラート設定

```yaml
# prometheus-alerts.yml
groups:
  - name: liff-chat-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is above 1 second"
```

## 🔧 トラブルシューティング詳細

### 一般的な問題と解決策

#### 1. LIFF初期化エラー

**症状:**
```
LIFF init failed: Invalid LIFF ID
```

**原因と解決策:**
```javascript
// デバッグ情報の追加
liff.init({
  liffId: CONFIG.liffId,
  withLoginOnExternalBrowser: true
}).catch(error => {
  console.error('LIFF init error details:', {
    error: error.message,
    liffId: CONFIG.liffId,
    url: window.location.href,
    userAgent: navigator.userAgent
  });
});
```

**チェックリスト:**
- [ ] LIFF IDが正しく設定されているか
- [ ] LINE Developersコンソールでエンドポイント URLが正しいか
- [ ] HTTPSで動作しているか（本番環境）
- [ ] ドメインがLINEプラットフォームに登録されているか

#### 2. JWT検証エラー

**症状:**
```
JsonWebTokenError: invalid signature
```

**デバッグ手順:**
```bash
# JWTの内容を確認
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d | jq

# 環境変数の確認
node -e "console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length)"
```

#### 3. CORS エラー

**症状:**
```
Access to fetch at 'http://localhost:3000/auth' from origin 'https://liff.line.me' has been blocked by CORS policy
```

**解決策:**
```javascript
// CORS設定のデバッグ
app.use((req, res, next) => {
  console.log('CORS Debug:', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path
  });
  next();
});
```

#### 4. メモリリーク

**検出方法:**
```javascript
// メモリ使用量の監視
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}, 60000); // 1分ごと
```

## ⚡ パフォーマンス最適化

### 1. キャッシング戦略

```javascript
// Redis を使用したキャッシング
const redis = require('redis');
const client = redis.createClient();

// ユーザー情報のキャッシュ
async function getCachedUserInfo(userId) {
  const cacheKey = `user:${userId}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const userInfo = await fetchUserInfoFromDB(userId);
  await client.setex(cacheKey, 300, JSON.stringify(userInfo)); // 5分間キャッシュ
  return userInfo;
}
```

### 2. 圧縮の有効化

```javascript
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // 圧縮レベル（1-9）
}));
```

### 3. 接続プーリング

```javascript
// HTTP Keep-Alive の設定
const https = require('https');
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

// axiosでの使用
const axiosInstance = axios.create({
  httpsAgent: keepAliveAgent,
  timeout: 10000
});
```

## 📈 スケーリング戦略

### 1. 水平スケーリング

```javascript
// cluster モジュールを使用
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // ワーカープロセスの起動
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // 自動再起動
  });
} else {
  // ワーカープロセス
  require('./index.js');
  console.log(`Worker ${process.pid} started`);
}
```

### 2. ロードバランシング

```nginx
# Nginx upstream 設定
upstream app_servers {
    least_conn;
    server 127.0.0.1:3001 weight=3;
    server 127.0.0.1:3002 weight=2;
    server 127.0.0.1:3003 weight=1;
    keepalive 32;
}
```

### 3. データベース最適化

```javascript
// 接続プールの設定
const { Pool } = require('pg');
const pool = new Pool({
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000
});

// クエリの最適化
const getUserPaymentStatus = async (userId) => {
  const query = `
    SELECT 
      u.id, 
      u.is_paid,
      u.subscription_expires_at
    FROM users u
    WHERE u.line_user_id = $1
    AND u.is_active = true
    FOR UPDATE SKIP LOCKED
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};
```

## 💾 バックアップ・リカバリ

### 1. データバックアップ

```bash
#!/bin/bash
# backup.sh

# 環境変数のバックアップ
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# データベースバックアップ（PostgreSQL例）
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# S3へのアップロード
aws s3 cp backup_*.sql s3://your-backup-bucket/database/
```

### 2. 災害復旧計画

```yaml
# disaster-recovery-plan.yml
recovery_objectives:
  rto: "4 hours"  # Recovery Time Objective
  rpo: "1 hour"   # Recovery Point Objective

backup_schedule:
  database:
    frequency: "hourly"
    retention: "7 days"
  
  application:
    frequency: "daily"
    retention: "30 days"

failover_procedures:
  - step: "Detect failure"
    sla: "5 minutes"
  
  - step: "Notify team"
    sla: "10 minutes"
  
  - step: "Switch to backup"
    sla: "30 minutes"
  
  - step: "Verify services"
    sla: "1 hour"
```

### 3. ロールバック手順

```bash
#!/bin/bash
# rollback.sh

# 前のバージョンにロールバック
PREVIOUS_VERSION=$(git tag | sort -V | tail -2 | head -1)

echo "Rolling back to version: $PREVIOUS_VERSION"

# Git でロールバック
git checkout $PREVIOUS_VERSION

# 依存関係の再インストール
npm ci --production

# サービスの再起動
pm2 restart liff-chat-service

# ヘルスチェック
curl -f http://localhost:3000/health || exit 1

echo "Rollback completed successfully"
```

## 📞 サポート・連絡先

### 開発チーム
- **テクニカルリード**: tech-lead@example.com
- **DevOps**: devops@example.com
- **セキュリティ**: security@example.com

### エスカレーション手順
1. **Level 1**: アプリケーションログ確認
2. **Level 2**: 開発チームへ連絡
3. **Level 3**: テクニカルリードへエスカレーション
4. **Level 4**: 緊急対応チーム招集

### 有用なリソース
- [社内Wiki](https://wiki.example.com/liff-chat-service)
- [監視ダッシュボード](https://monitoring.example.com)
- [ログ分析](https://logs.example.com)
- [インシデント管理](https://incidents.example.com)