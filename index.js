/**
 * LIFF Authentication and Chat Proxy Server
 * 
 * このサーバーは以下の機能を提供します：
 * 1. LINE IDトークンの検証と課金状態の確認
 * 2. JWTトークンの発行
 * 3. Difyチャットへのプロキシアクセス
 */

// 必要なモジュールのインポート
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Express アプリケーションの初期化
const app = express();

// 環境変数の検証
const requiredEnvVars = [
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'JWT_SECRET',
  'PORT'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Error: ${varName} is not set in environment variables`);
    process.exit(1);
  }
});

// ミドルウェアの設定
// セキュリティヘッダーの設定
app.use(helmet({
  // iframeでの表示を許可するためframeGuardを無効化
  contentSecurityPolicy: false,
  frameguard: false
}));

// CORS設定
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['https://line.me', 'https://liff.line.me'];
    
    // 開発環境ではlocalhostを許可
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000');
    }
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// リクエストボディのパース
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ロギング設定
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// レート制限の設定
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 最大100リクエスト
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 認証エンドポイントにレート制限を適用
app.use('/auth', limiter);

/**
 * LINE IDトークンの検証
 * @param {string} idToken - LINE IDトークン
 * @returns {Object} デコードされたトークンペイロード
 */
async function verifyLineIdToken(idToken) {
  try {
    // LINE IDトークンの検証エンドポイント
    const response = await axios.post('https://api.line.me/oauth2/v2.1/verify', {
      id_token: idToken,
      client_id: process.env.LINE_CHANNEL_ID
    });

    const data = response.data;

    // トークンの有効性確認
    if (data.error) {
      throw new Error(data.error_description || 'Invalid ID token');
    }

    // 有効期限のチェック
    const now = Math.floor(Date.now() / 1000);
    if (data.exp < now) {
      throw new Error('ID token has expired');
    }

    // チャンネルIDの確認
    if (data.aud !== process.env.LINE_CHANNEL_ID) {
      throw new Error('Invalid audience');
    }

    return data;
  } catch (error) {
    console.error('LINE ID token verification failed:', error.message);
    throw error;
  }
}

/**
 * ユーザーの課金状態を確認
 * @param {string} userId - LINE ユーザーID
 * @returns {boolean} 課金済みの場合true
 */
async function checkPaymentStatus(userId) {
  // TODO: 実際のデータベース照合処理を実装
  // 以下は仮の実装例
  
  // 例: PostgreSQLを使用する場合
  // const { Pool } = require('pg');
  // const pool = new Pool({
  //   host: process.env.DB_HOST,
  //   port: process.env.DB_PORT,
  //   database: process.env.DB_NAME,
  //   user: process.env.DB_USER,
  //   password: process.env.DB_PASSWORD,
  // });
  // 
  // try {
  //   const result = await pool.query(
  //     'SELECT is_paid FROM users WHERE line_user_id = $1',
  //     [userId]
  //   );
  //   return result.rows.length > 0 && result.rows[0].is_paid === true;
  // } catch (error) {
  //   console.error('Database error:', error);
  //   throw error;
  // }

  // 仮実装：すべてのユーザーを課金済みとして扱う
  console.log(`Checking payment status for user: ${userId}`);
  return true;
}

/**
 * JWTトークンの生成
 * @param {Object} payload - トークンに含めるデータ
 * @returns {string} 生成されたJWTトークン
 */
function generateJWT(payload) {
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '5m',
    algorithm: 'HS256',
    issuer: 'claude-liff-auth'
  };

  // JWTIDを追加してトークンのユニーク性を保証
  payload.jti = crypto.randomBytes(16).toString('hex');
  payload.iat = Math.floor(Date.now() / 1000);

  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

/**
 * JWTトークンの検証
 * @param {string} token - 検証するトークン
 * @returns {Object} デコードされたトークンペイロード
 */
function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'claude-liff-auth'
    });
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    throw error;
  }
}

/**
 * 静的ファイルの提供（LIFFフロントエンド）
 */
app.use(express.static('public'));

/**
 * ヘルスチェックエンドポイント
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * 認証エンドポイント
 * LINE IDトークンを検証し、課金状態を確認後、JWTを発行
 */
app.post('/auth', async (req, res) => {
  try {
    const { idToken } = req.body;

    // リクエストバリデーション
    if (!idToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ID token is required'
      });
    }

    // LINE IDトークンの検証
    let lineUserData;
    try {
      lineUserData = await verifyLineIdToken(idToken);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired ID token'
      });
    }

    const userId = lineUserData.sub;
    const userName = lineUserData.name || 'User';

    // 課金状態の確認
    let isPaid;
    try {
      isPaid = await checkPaymentStatus(userId);
    } catch (error) {
      console.error('Payment status check failed:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check payment status'
      });
    }

    if (!isPaid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Chat service is available for paid users only',
        isPaid: false
      });
    }

    // JWTトークンの生成
    const jwtPayload = {
      userId,
      userName,
      isPaid: true,
      permissions: ['chat_access']
    };

    const token = generateJWT(jwtPayload);

    // 成功レスポンス
    res.json({
      success: true,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '5m',
      user: {
        id: userId,
        name: userName,
        isPaid: true
      }
    });

  } catch (error) {
    console.error('Auth endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * チャットプロキシエンドポイント
 * JWTを検証し、有効な場合はDifyチャットのHTMLを取得して返す
 */
app.get('/chat-proxy', async (req, res) => {
  try {
    const token = req.query.token;

    // トークンの存在確認
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">エラー</h1>
          <p>認証トークンが必要です。</p>
        </body>
        </html>
      `);
    }

    // JWTの検証
    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (error) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Denied</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">アクセス拒否</h1>
          <p>認証トークンが無効または期限切れです。</p>
          <p>再度ログインしてください。</p>
        </body>
        </html>
      `);
    }

    // 課金状態の再確認（セキュリティのため）
    if (!decoded.isPaid) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Subscription Required</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .warning { color: #f57c00; }
          </style>
        </head>
        <body>
          <h1 class="warning">有料サービス</h1>
          <p>チャット機能は有料会員限定です。</p>
        </body>
        </html>
      `);
    }

    // Difyチャットの取得
    const chatUrl = process.env.DIFY_CHAT_URL || 'https://udify.app/chatbot/xxxx';
    
    try {
      const response = await axios.get(chatUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LIFF-Chat-Proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en;q=0.9'
        },
        timeout: 10000, // 10秒のタイムアウト
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // 5xx以外は成功とみなす
      });

      // Content-Typeをそのまま転送
      const contentType = response.headers['content-type'] || 'text/html; charset=utf-8';
      res.setHeader('Content-Type', contentType);
      
      // キャッシュ制御
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // HTMLを返す
      res.send(response.data);

    } catch (error) {
      console.error('Failed to fetch chat:', error.message);
      
      // エラーレスポンス
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Chat Unavailable</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background-color: #f5f5f5;
            }
            .error { 
              color: #d32f2f; 
              margin-bottom: 20px;
            }
            .retry-button {
              background-color: #4CAF50;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }
            .retry-button:hover {
              background-color: #45a049;
            }
          </style>
        </head>
        <body>
          <h1 class="error">チャットサービスに接続できません</h1>
          <p>一時的な問題が発生しています。</p>
          <p>しばらく待ってから再度お試しください。</p>
          <button class="retry-button" onclick="location.reload()">再読み込み</button>
        </body>
        </html>
      `;
      
      res.status(503).send(errorHtml);
    }

  } catch (error) {
    console.error('Chat proxy error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #d32f2f; }
        </style>
      </head>
      <body>
        <h1 class="error">システムエラー</h1>
        <p>予期しないエラーが発生しました。</p>
      </body>
      </html>
    `);
  }
});

// 404エラーハンドリング
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path
  });
});

// グローバルエラーハンドリング
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // CORSエラー
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CORS policy violation'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message
  });
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'LINE domains'}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;