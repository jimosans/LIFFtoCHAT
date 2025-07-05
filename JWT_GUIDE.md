# JWT（JSON Web Token）完全ガイド

## 📋 目次

1. [JWTとは](#jwtとは)
2. [JWT構造の詳細解説](#jwt構造の詳細解説)
3. [本システムでのJWT実装](#本システムでのjwt実装)
4. [JWTのセキュリティ](#jwtのセキュリティ)
5. [JWT生成・検証のコード解説](#jwt生成検証のコード解説)
6. [JWTトークンの管理](#jwtトークンの管理)
7. [デバッグ・トラブルシューティング](#デバッグトラブルシューティング)
8. [ベストプラクティス](#ベストプラクティス)
9. [よくある質問](#よくある質問)

## 🔐 JWTとは

### JWT（JSON Web Token）の基本概念

JWT（ジョット）は、JSON形式のデータを安全にやり取りするためのオープンスタンダードです。

```javascript
// JWTの基本的な用途
const purposes = {
  authentication: "ユーザーの認証状態を維持",
  authorization: "リソースへのアクセス権限を管理", 
  information_exchange: "安全な情報交換"
};
```

### なぜJWTを使うのか？

| 従来のセッション | JWT |
|-----------------|-----|
| サーバー側でセッション情報を保存 | クライアント側で自己完結 |
| セッションストレージが必要 | ステートレス |
| スケーリングが困難 | スケーリングしやすい |
| セッション同期が必要 | サーバー間での同期不要 |

### 本システムでの活用シーン

```mermaid
flowchart LR
    A[LINE IDトークン] --> B[サーバー検証]
    B --> C{課金状態確認}
    C -->|課金済み| D[JWT発行]
    C -->|未課金| E[エラー返却]
    D --> F[クライアント保存]
    F --> G[チャットアクセス時に使用]
    G --> H[サーバーでJWT検証]
    H --> I[Difyチャットプロキシ]
```

## 🔍 JWT構造の詳細解説

### JWTの3つの部分

JWTは `.` で区切られた3つの部分で構成されます：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

#### 1. Header（ヘッダー）

```javascript
// Base64URLエンコード前
{
  "alg": "HS256",  // 署名アルゴリズム
  "typ": "JWT"     // トークンタイプ
}

// Base64URLエンコード後
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

**使用可能なアルゴリズム:**
- `HS256` (HMAC SHA-256) - 本システムで使用
- `RS256` (RSA SHA-256)
- `ES256` (ECDSA SHA-256)

#### 2. Payload（ペイロード）

```javascript
// 本システムでのペイロード例
{
  // 標準クレーム（RFC 7519で定義）
  "iss": "claude-liff-auth",           // 発行者
  "sub": "U1234567890abcdef",          // 主体（ユーザーID）
  "aud": "chat-service",               // 対象者
  "exp": 1672531200,                   // 有効期限（Unix timestamp）
  "iat": 1672530900,                   // 発行時刻
  "jti": "abc123def456",               // JWT ID（ユニーク識別子）
  
  // カスタムクレーム
  "userId": "U1234567890abcdef",       // LINE ユーザーID
  "userName": "山田太郎",               // ユーザー名
  "isPaid": true,                      // 課金状態
  "permissions": ["chat_access"],       // 権限
  "sessionId": "sess_abc123"           // セッションID
}
```

**クレーム（Claim）の種類:**

| タイプ | 説明 | 例 |
|--------|------|-----|
| Registered | RFC定義済み | `iss`, `exp`, `iat` |
| Public | 公開可能 | `email`, `name` |
| Private | アプリ固有 | `userId`, `isPaid` |

#### 3. Signature（署名）

```javascript
// 署名の生成方法
const signature = HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret  // JWT_SECRET
);
```

## 🏗️ 本システムでのJWT実装

### JWT生成処理の詳細

```javascript
/**
 * JWTトークンの生成
 * @param {Object} userInfo - ユーザー情報
 * @returns {string} 生成されたJWTトークン
 */
function generateJWT(userInfo) {
  // ペイロードの構築
  const payload = {
    // 標準クレーム
    iss: 'claude-liff-auth',              // 発行者
    sub: userInfo.userId,                  // 主体（ユーザーID）
    aud: 'chat-service',                   // 対象者
    iat: Math.floor(Date.now() / 1000),    // 発行時刻
    jti: crypto.randomBytes(16).toString('hex'), // ユニークID
    
    // カスタムクレーム
    userId: userInfo.userId,
    userName: userInfo.userName,
    isPaid: userInfo.isPaid,
    permissions: ['chat_access'],
    sessionId: generateSessionId()         // セッション管理用
  };

  // JWT生成オプション
  const options = {
    algorithm: 'HS256',                    // 署名アルゴリズム
    expiresIn: process.env.JWT_EXPIRES_IN || '5m', // 有効期限
    issuer: 'claude-liff-auth',            // 発行者（再確認）
    audience: 'chat-service'               // 対象者（再確認）
  };

  // JWTの生成
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, options);
    
    // ログ出力（本番環境では注意）
    console.log('JWT生成成功:', {
      userId: userInfo.userId,
      expiresIn: options.expiresIn,
      jti: payload.jti
    });
    
    return token;
  } catch (error) {
    console.error('JWT生成エラー:', error);
    throw new Error('Failed to generate JWT');
  }
}
```

### JWT検証処理の詳細

```javascript
/**
 * JWTトークンの検証
 * @param {string} token - 検証するトークン
 * @returns {Object} デコードされたペイロード
 */
function verifyJWT(token) {
  // 検証オプション
  const options = {
    algorithms: ['HS256'],                 // 許可アルゴリズム
    issuer: 'claude-liff-auth',            // 発行者確認
    audience: 'chat-service',              // 対象者確認
    clockTolerance: 30,                    // 時刻の許容誤差（秒）
    ignoreExpiration: false,               // 有効期限をチェック
    ignoreNotBefore: false                 // nbf（not before）をチェック
  };

  try {
    // JWTの検証とデコード
    const decoded = jwt.verify(token, process.env.JWT_SECRET, options);
    
    // 追加のビジネスロジック検証
    if (!decoded.userId || !decoded.isPaid) {
      throw new Error('Invalid token payload');
    }
    
    // セッション有効性の確認（必要に応じて）
    // await validateSession(decoded.sessionId);
    
    console.log('JWT検証成功:', {
      userId: decoded.userId,
      jti: decoded.jti,
      remainingTime: decoded.exp - Math.floor(Date.now() / 1000)
    });
    
    return decoded;
  } catch (error) {
    // エラータイプ別のハンドリング
    if (error.name === 'TokenExpiredError') {
      console.warn('JWT期限切れ:', { expiredAt: error.expiredAt });
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.error('JWT形式エラー:', error.message);
      throw new Error('Invalid token format');
    } else if (error.name === 'NotBeforeError') {
      console.warn('JWT未来時刻エラー:', { date: error.date });
      throw new Error('Token not active yet');
    } else {
      console.error('JWT検証エラー:', error);
      throw new Error('Token verification failed');
    }
  }
}
```

## 🛡️ JWTのセキュリティ

### 1. シークレットキーの管理

```javascript
// ❌ 危険：ハードコーディング
const secret = 'mysecret';

// ❌ 危険：短すぎるキー
const secret = '123456';

// ✅ 安全：環境変数 + 強力なキー
const secret = process.env.JWT_SECRET; // 最低32文字以上

// 強力なシークレットキーの生成例
const crypto = require('crypto');
const strongSecret = crypto.randomBytes(64).toString('hex');
console.log('Generated secret:', strongSecret);
```

### 2. 有効期限の設定

```javascript
// セキュリティレベル別の推奨設定
const expirationSettings = {
  // 高セキュリティ：短時間
  highSecurity: '5m',      // 5分
  
  // 中セキュリティ：中程度
  mediumSecurity: '1h',    // 1時間
  
  // 低セキュリティ：長時間（非推奨）
  lowSecurity: '24h'       // 24時間
};

// 本システムでは高セキュリティ設定を採用
const JWT_EXPIRES_IN = '5m';
```

### 3. アルゴリズムの選択

```javascript
// セキュリティ強度比較
const algorithms = {
  'HS256': {
    type: '対称暗号',
    security: '高',
    performance: '高',
    use_case: '単一サービス'
  },
  'RS256': {
    type: '非対称暗号',
    security: '最高',
    performance: '中',
    use_case: 'マイクロサービス'
  },
  'ES256': {
    type: 'ECDSA',
    security: '最高',
    performance: '高',
    use_case: 'モバイルアプリ'
  }
};

// 本システムではHS256を使用（理由：シンプルで高性能）
```

### 4. センシティブ情報の扱い

```javascript
// ❌ 危険：センシティブ情報をペイロードに含める
const badPayload = {
  userId: 'U123',
  password: 'secret123',        // パスワードは絶対NG
  creditCard: '1234-5678-9012', // クレジットカード情報もNG
  socialSecurityNumber: '123-45-6789' // 個人番号もNG
};

// ✅ 安全：必要最小限の情報のみ
const goodPayload = {
  userId: 'U123',
  userName: '山田太郎',         // 公開情報のみ
  isPaid: true,                // ビジネスロジックに必要
  permissions: ['chat_access'] // アクセス制御用
};
```

## 💻 JWT生成・検証のコード解説

### 詳細なエラーハンドリング

```javascript
/**
 * 高度なJWT検証（エラーハンドリング強化版）
 */
function advancedVerifyJWT(token) {
  // 事前チェック
  if (!token) {
    throw new ValidationError('Token is required');
  }
  
  if (typeof token !== 'string') {
    throw new ValidationError('Token must be a string');
  }
  
  // JWTフォーマットの基本確認
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ValidationError('Invalid JWT format');
  }

  try {
    // ヘッダーの事前確認
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (header.alg !== 'HS256') {
      throw new SecurityError(`Unsupported algorithm: ${header.alg}`);
    }

    // メイン検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'claude-liff-auth',
      audience: 'chat-service'
    });

    // ビジネスロジック検証
    validateBusinessRules(decoded);
    
    // セキュリティチェック
    performSecurityChecks(decoded);
    
    return decoded;
    
  } catch (error) {
    // 構造化されたエラーログ
    logJWTError(error, token);
    throw mapJWTError(error);
  }
}

/**
 * ビジネスルール検証
 */
function validateBusinessRules(decoded) {
  const requiredFields = ['userId', 'isPaid', 'permissions'];
  
  for (const field of requiredFields) {
    if (!(field in decoded)) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
  
  if (!decoded.isPaid) {
    throw new AuthorizationError('User subscription required');
  }
  
  if (!decoded.permissions.includes('chat_access')) {
    throw new AuthorizationError('Insufficient permissions');
  }
}

/**
 * セキュリティチェック
 */
function performSecurityChecks(decoded) {
  // トークンの残り有効時間確認
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = decoded.exp - now;
  
  if (timeUntilExpiry < 0) {
    throw new TokenExpiredError('Token has expired');
  }
  
  // 短すぎる有効期限の警告
  if (timeUntilExpiry > 300) { // 5分以上
    console.warn('Unusually long token expiry:', {
      userId: decoded.userId,
      expiryIn: timeUntilExpiry
    });
  }
  
  // 発行時刻の妥当性確認
  const issuedAgo = now - decoded.iat;
  if (issuedAgo < 0) {
    throw new SecurityError('Token issued in the future');
  }
  
  if (issuedAgo > 86400) { // 24時間以上前
    console.warn('Old token being used:', {
      userId: decoded.userId,
      issuedAgo: issuedAgo
    });
  }
}
```

### リフレッシュトークン機能

```javascript
/**
 * トークンリフレッシュ機能
 */
class TokenManager {
  constructor() {
    this.refreshThreshold = 60; // 残り60秒でリフレッシュ
  }

  /**
   * トークンの自動リフレッシュチェック
   */
  async checkAndRefreshToken(currentToken) {
    try {
      const decoded = jwt.decode(currentToken);
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - now;
      
      // リフレッシュが必要かチェック
      if (timeLeft <= this.refreshThreshold) {
        console.log('Token refresh needed:', {
          userId: decoded.userId,
          timeLeft: timeLeft
        });
        
        return await this.refreshToken(decoded.userId);
      }
      
      return currentToken; // まだ有効
      
    } catch (error) {
      console.error('Token refresh check failed:', error);
      throw error;
    }
  }

  /**
   * 新しいトークンの発行
   */
  async refreshToken(userId) {
    try {
      // ユーザー情報の再取得
      const userInfo = await getUserInfo(userId);
      
      // 課金状態の再確認
      const isPaid = await checkPaymentStatus(userId);
      
      if (!isPaid) {
        throw new AuthorizationError('Subscription expired');
      }
      
      // 新しいトークンの生成
      const newToken = generateJWT({
        userId: userId,
        userName: userInfo.userName,
        isPaid: isPaid
      });
      
      console.log('Token refreshed successfully:', {
        userId: userId,
        newJti: jwt.decode(newToken).jti
      });
      
      return newToken;
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }
}
```

## 🔄 JWTトークンの管理

### フロントエンドでのトークン管理

```javascript
/**
 * フロントエンド JWT管理クラス
 */
class JWTManager {
  constructor() {
    this.token = null;
    this.refreshTimer = null;
    this.storageKey = 'liff_chat_token';
  }

  /**
   * トークンの保存
   */
  setToken(token) {
    this.token = token;
    
    // セキュリティ考慮：sessionStorageを使用（XSS対策）
    sessionStorage.setItem(this.storageKey, token);
    
    // 自動リフレッシュのスケジュール
    this.scheduleRefresh(token);
    
    console.log('Token stored successfully');
  }

  /**
   * トークンの取得
   */
  getToken() {
    if (!this.token) {
      this.token = sessionStorage.getItem(this.storageKey);
    }
    return this.token;
  }

  /**
   * トークンの削除
   */
  clearToken() {
    this.token = null;
    sessionStorage.removeItem(this.storageKey);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    console.log('Token cleared');
  }

  /**
   * トークンの有効性確認
   */
  isValid() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const decoded = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * トークンのデコード（検証なし）
   */
  decodeToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    return payload;
  }

  /**
   * 自動リフレッシュのスケジュール
   */
  scheduleRefresh(token) {
    try {
      const decoded = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      const timeUntilRefresh = (decoded.exp - now - 60) * 1000; // 60秒前にリフレッシュ
      
      if (timeUntilRefresh > 0) {
        this.refreshTimer = setTimeout(() => {
          this.refreshToken();
        }, timeUntilRefresh);
        
        console.log('Token refresh scheduled in', timeUntilRefresh / 1000, 'seconds');
      }
    } catch (error) {
      console.error('Failed to schedule token refresh:', error);
    }
  }

  /**
   * トークンのリフレッシュ
   */
  async refreshToken() {
    try {
      const currentToken = this.getToken();
      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      const decoded = this.decodeToken(currentToken);
      
      // サーバーに新しいトークンを要求
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          userId: decoded.userId
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setToken(data.token);
      
      console.log('Token refreshed successfully');
      
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearToken();
      // 再ログインを促す
      window.dispatchEvent(new CustomEvent('tokenExpired'));
    }
  }
}

// グローバルインスタンス
const jwtManager = new JWTManager();
```

### サーバーサイドでのトークン管理

```javascript
/**
 * JWTブラックリスト管理（Redis使用例）
 */
class JWTBlacklist {
  constructor(redisClient) {
    this.redis = redisClient;
    this.prefix = 'jwt_blacklist:';
  }

  /**
   * トークンをブラックリストに追加
   */
  async addToBlacklist(token, reason = 'logout') {
    try {
      const decoded = jwt.decode(token);
      const key = this.prefix + decoded.jti;
      const expiry = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (expiry > 0) {
        await this.redis.setex(key, expiry, JSON.stringify({
          userId: decoded.userId,
          reason: reason,
          blacklistedAt: new Date().toISOString()
        }));
        
        console.log('Token blacklisted:', {
          jti: decoded.jti,
          reason: reason
        });
      }
    } catch (error) {
      console.error('Failed to blacklist token:', error);
    }
  }

  /**
   * トークンがブラックリストにあるかチェック
   */
  async isBlacklisted(token) {
    try {
      const decoded = jwt.decode(token);
      const key = this.prefix + decoded.jti;
      const result = await this.redis.get(key);
      
      return result !== null;
    } catch (error) {
      console.error('Blacklist check failed:', error);
      return false; // エラー時は通す（可用性優先）
    }
  }

  /**
   * 期限切れのブラックリストエントリを削除
   */
  async cleanup() {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleaned++;
        }
      }
      
      console.log(`Cleaned up ${cleaned} expired blacklist entries`);
    } catch (error) {
      console.error('Blacklist cleanup failed:', error);
    }
  }
}
```

## 🐛 デバッグ・トラブルシューティング

### 1. JWTデバッグツール

```javascript
/**
 * JWT デバッグユーティリティ
 */
class JWTDebugger {
  /**
   * トークンの詳細情報を表示
   */
  static analyzeToken(token) {
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return { error: 'Invalid JWT format: must have 3 parts' };
      }

      // ヘッダーをデコード
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString()
      );

      // ペイロードをデコード
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString()
      );

      // 時刻情報の計算
      const now = Math.floor(Date.now() / 1000);
      const issuedAgo = now - (payload.iat || 0);
      const expiresIn = (payload.exp || 0) - now;
      
      return {
        header: header,
        payload: payload,
        signature: parts[2],
        timing: {
          issuedAgo: issuedAgo,
          expiresIn: expiresIn,
          isExpired: expiresIn <= 0,
          issuedAt: new Date((payload.iat || 0) * 1000).toISOString(),
          expiresAt: new Date((payload.exp || 0) * 1000).toISOString()
        },
        size: {
          total: token.length,
          header: parts[0].length,
          payload: parts[1].length,
          signature: parts[2].length
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * トークンの視覚的表示
   */
  static visualizeToken(token) {
    const analysis = this.analyzeToken(token);
    
    if (analysis.error) {
      console.error('❌ JWT Analysis Error:', analysis.error);
      return;
    }

    console.log('🔍 JWT Analysis:');
    console.log('📋 Header:', JSON.stringify(analysis.header, null, 2));
    console.log('📦 Payload:', JSON.stringify(analysis.payload, null, 2));
    console.log('🕐 Timing:');
    console.log(`   Issued: ${analysis.timing.issuedAt} (${analysis.timing.issuedAgo}s ago)`);
    console.log(`   Expires: ${analysis.timing.expiresAt} (${analysis.timing.expiresIn}s)`);
    console.log(`   Status: ${analysis.timing.isExpired ? '❌ Expired' : '✅ Valid'}`);
    console.log('📏 Size:', `${analysis.size.total} chars total`);
  }

  /**
   * 署名の検証（シークレットありの場合）
   */
  static verifySignature(token, secret) {
    try {
      const parts = token.split('.');
      const data = parts[0] + '.' + parts[1];
      const signature = parts[2];
      
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64url');
      
      const isValid = signature === expectedSignature;
      
      console.log('🔐 Signature Verification:');
      console.log(`   Expected: ${expectedSignature}`);
      console.log(`   Actual:   ${signature}`);
      console.log(`   Status:   ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      return isValid;
    } catch (error) {
      console.error('❌ Signature verification error:', error.message);
      return false;
    }
  }
}

// 使用例
console.log('=== JWT Debug Mode ===');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
JWTDebugger.visualizeToken(token);
JWTDebugger.verifySignature(token, process.env.JWT_SECRET);
```

### 2. よくあるエラーと解決法

```javascript
/**
 * エラー別の対処法
 */
const jwtErrorHandlers = {
  'TokenExpiredError': {
    description: 'トークンの有効期限が切れています',
    solution: 'トークンを再発行するか、ユーザーに再ログインを促してください',
    code: `
      // 自動リフレッシュの実装
      if (error.name === 'TokenExpiredError') {
        const newToken = await refreshToken(oldToken);
        return newToken;
      }
    `
  },

  'JsonWebTokenError': {
    description: 'JWTの形式が無効です',
    solution: 'トークンの構造を確認し、正しい形式かチェックしてください',
    code: `
      // 事前チェック
      if (!token || token.split('.').length !== 3) {
        throw new Error('Invalid JWT format');
      }
    `
  },

  'NotBeforeError': {
    description: 'トークンがまだ有効になっていません',
    solution: 'nbf（not before）クレームを確認してください',
    code: `
      // nbfクレームの設定
      const payload = {
        ...otherClaims,
        nbf: Math.floor(Date.now() / 1000) // 現在時刻から有効
      };
    `
  },

  'SignatureInvalidError': {
    description: '署名が無効です',
    solution: 'JWT_SECRETが正しいか確認してください',
    code: `
      // シークレットの確認
      console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
      console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
    `
  }
};

/**
 * エラーハンドリングヘルパー
 */
function handleJWTError(error) {
  const handler = jwtErrorHandlers[error.name];
  
  if (handler) {
    console.error(`🚨 ${error.name}:`, handler.description);
    console.log('💡 Solution:', handler.solution);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Code example:', handler.code);
    }
  } else {
    console.error('🚨 Unknown JWT error:', error);
  }
}
```

### 3. パフォーマンス測定

```javascript
/**
 * JWT パフォーマンス測定
 */
class JWTPerformanceMonitor {
  static async measureOperations(iterations = 1000) {
    const testPayload = {
      userId: 'U1234567890abcdef',
      userName: 'テストユーザー',
      isPaid: true,
      permissions: ['chat_access']
    };

    console.log(`🏃‍♂️ JWT Performance Test (${iterations} iterations):`);

    // 生成パフォーマンス
    console.time('JWT Sign');
    const tokens = [];
    for (let i = 0; i < iterations; i++) {
      tokens.push(generateJWT(testPayload));
    }
    console.timeEnd('JWT Sign');

    // 検証パフォーマンス
    console.time('JWT Verify');
    for (const token of tokens) {
      verifyJWT(token);
    }
    console.timeEnd('JWT Verify');

    // メモリ使用量
    const memUsage = process.memoryUsage();
    console.log('💾 Memory usage:');
    console.log(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

    // トークンサイズ分析
    const sampleToken = tokens[0];
    console.log('📏 Token size analysis:');
    console.log(`   Token length: ${sampleToken.length} chars`);
    console.log(`   Estimated size: ${Math.round(sampleToken.length * 1.33)} bytes`);
  }

  static profileMemoryLeak() {
    console.log('🔍 Memory leak detection test starting...');
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    // 大量のトークン生成と破棄
    for (let i = 0; i < 10000; i++) {
      const token = generateJWT({ userId: `U${i}`, isPaid: true });
      verifyJWT(token);
      
      if (i % 1000 === 0) {
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        console.log(`Iteration ${i}: Memory increase: ${Math.round(memoryIncrease / 1024)}KB`);
      }
    }
    
    // ガベージコレクション強制実行
    if (global.gc) {
      global.gc();
      console.log('Garbage collection executed');
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const totalIncrease = finalMemory - initialMemory;
    
    console.log(`🏁 Final memory increase: ${Math.round(totalIncrease / 1024)}KB`);
    
    if (totalIncrease > 1024 * 1024) { // 1MB以上の増加
      console.warn('⚠️  Potential memory leak detected!');
    } else {
      console.log('✅ No significant memory leak detected');
    }
  }
}
```

## 📚 ベストプラクティス

### 1. セキュリティベストプラクティス

```javascript
/**
 * セキュリティチェックリスト
 */
const securityChecklist = {
  secrets: {
    '✅ 強力なシークレット': '最低256ビット（32文字）以上',
    '✅ 環境変数管理': 'コードにハードコーディングしない',
    '✅ ローテーション': '定期的なシークレット更新',
    '✅ 分離': '環境別のシークレット使用'
  },

  tokens: {
    '✅ 短い有効期限': '5-15分程度を推奨',
    '✅ 必要最小限の情報': 'センシティブ情報は含めない',
    '✅ 適切なクレーム': '標準クレームの活用',
    '✅ ユニークID': 'jtiクレームでトークン識別'
  },

  transmission: {
    '✅ HTTPS必須': '暗号化通信での送信',
    '✅ セキュアストレージ': 'sessionStorage推奨',
    '✅ ヘッダー送信': 'Authorization: Bearer形式',
    '✅ ログ除外': 'トークンをログに残さない'
  },

  validation: {
    '✅ 完全な検証': 'すべてのクレームをチェック',
    '✅ ブラックリスト': 'ログアウト時の無効化',
    '✅ エラーハンドリング': '適切なエラーレスポンス',
    '✅ レート制限': '総当たり攻撃対策'
  }
};
```

### 2. パフォーマンス最適化

```javascript
/**
 * JWTキャッシュ機能
 */
class JWTCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5分キャッシュ
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 検証結果のキャッシュ
   */
  setVerificationResult(tokenHash, result) {
    if (this.cache.size >= this.maxSize) {
      // LRU: 最も古いエントリを削除
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(tokenHash, {
      result: result,
      timestamp: Date.now()
    });
  }

  /**
   * キャッシュからの結果取得
   */
  getVerificationResult(tokenHash) {
    const cached = this.cache.get(tokenHash);
    
    if (!cached) return null;
    
    // TTL チェック
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(tokenHash);
      return null;
    }
    
    return cached.result;
  }

  /**
   * トークンハッシュの生成
   */
  generateTokenHash(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

/**
 * キャッシュ機能付きJWT検証
 */
const jwtCache = new JWTCache();

function cachedVerifyJWT(token) {
  const tokenHash = jwtCache.generateTokenHash(token);
  
  // キャッシュから結果を取得
  const cachedResult = jwtCache.getVerificationResult(tokenHash);
  if (cachedResult) {
    console.log('JWT verification cache hit');
    return cachedResult;
  }
  
  // 実際の検証
  try {
    const result = verifyJWT(token);
    jwtCache.setVerificationResult(tokenHash, result);
    console.log('JWT verification cache miss');
    return result;
  } catch (error) {
    // エラーはキャッシュしない
    throw error;
  }
}
```

### 3. 監視・ログ

```javascript
/**
 * JWT監視メトリクス
 */
class JWTMetrics {
  constructor() {
    this.metrics = {
      tokensGenerated: 0,
      tokensVerified: 0,
      verificationErrors: 0,
      expiredTokens: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * メトリクス更新
   */
  increment(metric) {
    if (metric in this.metrics) {
      this.metrics[metric]++;
    }
  }

  /**
   * メトリクス取得
   */
  getMetrics() {
    const uptime = process.uptime();
    return {
      ...this.metrics,
      uptime: uptime,
      rates: {
        tokenGenerationRate: this.metrics.tokensGenerated / uptime,
        verificationRate: this.metrics.tokensVerified / uptime,
        errorRate: this.metrics.verificationErrors / this.metrics.tokensVerified || 0,
        cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
      }
    };
  }

  /**
   * メトリクスのリセット
   */
  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0;
    });
  }
}

// グローバルメトリクス
const jwtMetrics = new JWTMetrics();

// メトリクス付きの関数ラッパー
function monitoredGenerateJWT(payload) {
  jwtMetrics.increment('tokensGenerated');
  return generateJWT(payload);
}

function monitoredVerifyJWT(token) {
  jwtMetrics.increment('tokensVerified');
  try {
    return verifyJWT(token);
  } catch (error) {
    jwtMetrics.increment('verificationErrors');
    if (error.name === 'TokenExpiredError') {
      jwtMetrics.increment('expiredTokens');
    }
    throw error;
  }
}
```

## ❓ よくある質問

### Q1: JWTとセッションはどちらを使うべき？

**A:** 用途によります：

| ケース | 推奨 | 理由 |
|--------|------|------|
| SPA/モバイル | JWT | ステートレス、スケーラブル |
| 従来のWebアプリ | セッション | サーバー側で制御しやすい |
| マイクロサービス | JWT | サービス間通信に便利 |
| 高セキュリティ要求 | セッション | 即座に無効化可能 |

### Q2: JWTの有効期限はどの程度に設定すべき？

**A:** セキュリティレベルに応じて：

```javascript
const expirationGuidelines = {
  'banking/payment': '5-15分',      // 金融系
  'social_media': '1-24時間',       // SNS
  'enterprise': '15分-1時間',       // 企業システム
  'gaming': '24時間-1週間',         // ゲーム
  'iot': '1週間-1ヶ月'             // IoT
};
```

### Q3: JWTに個人情報を含めても良い？

**A:** 基本的にはNGです：

```javascript
// ❌ 避けるべき情報
const sensitiveData = [
  'password',           // パスワード
  'socialSecurityNumber', // 個人番号
  'creditCardNumber',   // クレジットカード
  'privateKey',         // 秘密鍵
  'medicalRecord'       // 医療記録
];

// ✅ 含めても良い情報
const safeData = [
  'userId',             // ユーザーID
  'username',           // ユーザー名（公開情報）
  'role',               // ロール
  'permissions',        // 権限
  'subscriptionStatus'  // サブスクリプション状態
];
```

### Q4: JWTが盗まれた場合の対策は？

**A:** 多層防御が重要：

1. **予防策**
   - HTTPS必須
   - セキュアストレージ
   - 短い有効期限

2. **検出**
   - 異常なアクセスパターン監視
   - 地理的位置チェック
   - デバイス指紋認証

3. **対応**
   - ブラックリスト登録
   - 強制ログアウト
   - シークレットローテーション

### Q5: リフレッシュトークンは必要？

**A:** アプリの要件次第：

| ケース | リフレッシュトークン | 理由 |
|--------|-------------------|------|
| 短時間利用 | 不要 | 都度ログインで十分 |
| 長時間利用 | 必要 | UX改善 |
| モバイルアプリ | 推奨 | バックグラウンド対応 |
| 高セキュリティ | 慎重検討 | 攻撃面が増加 |

---

**最終更新**: 2024年1月  
**バージョン**: 1.0.0  
**関連ドキュメント**: [README.md](./README.md), [GUIDELINE.md](./GUIDELINE.md)