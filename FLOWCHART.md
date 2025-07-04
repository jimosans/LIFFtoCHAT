# システムフローチャート

## 全体フロー図

```mermaid
flowchart TB
    Start([ユーザーがLIFFページにアクセス]) --> InitLIFF[LIFF SDK初期化]
    
    InitLIFF --> CheckLogin{ログイン状態確認}
    
    CheckLogin -->|未ログイン| ShowLoginBtn[ログインボタン表示]
    CheckLogin -->|ログイン済み| GetProfile[プロフィール取得]
    
    ShowLoginBtn --> ClickLogin[ログインボタンクリック]
    ClickLogin --> LineLogin[LINE ログイン画面へ]
    LineLogin --> LoginSuccess[ログイン成功]
    LoginSuccess --> GetProfile
    
    GetProfile --> ShowAuthBtn[認証ボタン表示]
    ShowAuthBtn --> ClickAuth[認証ボタンクリック]
    
    ClickAuth --> GetIDToken[LIFF.getIDToken()実行]
    GetIDToken --> SendToBackend[IDトークンを/authへPOST]
    
    SendToBackend --> VerifyToken{IDトークン検証}
    VerifyToken -->|無効| AuthError[認証エラー返却]
    VerifyToken -->|有効| CheckPayment{課金状態確認}
    
    CheckPayment -->|未課金| PaymentError[課金エラー返却]
    CheckPayment -->|課金済み| GenerateJWT[JWT生成]
    
    GenerateJWT --> ReturnJWT[JWTをフロントエンドへ返却]
    ReturnJWT --> ShowChat[チャット表示用iframe設定]
    
    ShowChat --> RequestProxy[/chat-proxy?token=JWT へアクセス]
    RequestProxy --> VerifyJWT{JWT検証}
    
    VerifyJWT -->|無効| ProxyError[403エラーページ返却]
    VerifyJWT -->|有効| FetchDify[Difyチャット取得]
    
    FetchDify --> ReturnHTML[HTMLをそのまま返却]
    ReturnHTML --> DisplayChat[iframeにチャット表示]
    
    AuthError --> ShowError[エラーメッセージ表示]
    PaymentError --> ShowPaymentMsg[課金必要メッセージ表示]
    ProxyError --> ShowProxyError[エラーページ表示]
    
    style Start fill:#e1f5fe
    style DisplayChat fill:#c8e6c9
    style AuthError fill:#ffcdd2
    style PaymentError fill:#ffcdd2
    style ProxyError fill:#ffcdd2
```

## 認証フロー詳細

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド<br/>(LIFF)
    participant B as バックエンド<br/>(Express)
    participant L as LINE API
    participant D as データベース
    participant C as Dify Chat
    
    U->>F: ページアクセス
    F->>F: LIFF初期化
    F->>F: ログイン状態確認
    
    alt 未ログイン
        F->>U: ログインボタン表示
        U->>F: ログインボタンクリック
        F->>L: LINE ログイン
        L->>F: ログイン成功
    end
    
    F->>L: プロフィール取得
    L->>F: ユーザー情報返却
    F->>U: 認証ボタン表示
    
    U->>F: 認証ボタンクリック
    F->>F: IDトークン取得
    F->>B: POST /auth {idToken}
    
    B->>L: IDトークン検証
    L->>B: 検証結果
    
    alt トークン有効
        B->>D: 課金状態確認
        D->>B: 課金状態返却
        
        alt 課金済み
            B->>B: JWT生成
            B->>F: JWT返却
            F->>F: iframe設定
            F->>B: GET /chat-proxy?token=JWT
            B->>B: JWT検証
            
            alt JWT有効
                B->>C: チャット取得
                C->>B: HTML返却
                B->>F: HTML転送
                F->>U: チャット表示
            else JWT無効
                B->>F: 403エラー
                F->>U: エラー表示
            end
        else 未課金
            B->>F: 課金エラー
            F->>U: 課金必要表示
        end
    else トークン無効
        B->>F: 認証エラー
        F->>U: エラー表示
    end
```

## データフロー図

```mermaid
flowchart LR
    subgraph Frontend[フロントエンド]
        HTML[index.html]
        JS[JavaScript]
        LIFF[LIFF SDK]
    end
    
    subgraph Backend[バックエンド]
        Express[Express Server]
        Auth[/auth エンドポイント]
        Proxy[/chat-proxy エンドポイント]
        JWT[JWT処理]
    end
    
    subgraph External[外部サービス]
        LINE[LINE API]
        DB[(データベース)]
        Dify[Dify Chat]
    end
    
    JS --> LIFF
    LIFF --> LINE
    JS --> Auth
    Auth --> JWT
    Auth --> LINE
    Auth --> DB
    JS --> Proxy
    Proxy --> JWT
    Proxy --> Dify
    
    style Frontend fill:#e3f2fd
    style Backend fill:#f3e5f5
    style External fill:#fff3e0
```

## エラーハンドリングフロー

```mermaid
flowchart TB
    subgraph Errors[エラー種別]
        E1[LIFF初期化エラー]
        E2[ログインエラー]
        E3[IDトークン取得エラー]
        E4[認証エラー]
        E5[課金エラー]
        E6[JWT検証エラー]
        E7[チャット取得エラー]
    end
    
    subgraph Handling[エラーハンドリング]
        H1[再読み込み促す]
        H2[ログイン画面へ]
        H3[エラーメッセージ表示]
        H4[課金案内表示]
        H5[403ページ表示]
        H6[再試行ボタン表示]
    end
    
    E1 --> H1
    E2 --> H2
    E3 --> H3
    E4 --> H3
    E5 --> H4
    E6 --> H5
    E7 --> H6
    
    style Errors fill:#ffcdd2
    style Handling fill:#c5e1a5
```

## セキュリティフロー

```mermaid
flowchart TB
    subgraph Security[セキュリティ対策]
        S1[CORS設定]
        S2[レート制限]
        S3[Helmetミドルウェア]
        S4[JWT有効期限]
        S5[HTTPS必須]
        S6[環境変数管理]
    end
    
    subgraph Implementation[実装箇所]
        I1[許可オリジンのみ]
        I2[15分100リクエスト]
        I3[セキュリティヘッダー]
        I4[5分間の短期設定]
        I5[本番環境で強制]
        I6[.envファイル使用]
    end
    
    S1 --> I1
    S2 --> I2
    S3 --> I3
    S4 --> I4
    S5 --> I5
    S6 --> I6
    
    style Security fill:#b2dfdb
    style Implementation fill:#d1c4e9
```