# 交流戦スケジュール（バスケチーム向け）

Next.js (App Router) + TypeScript による、交流戦スケジューリング・出欠管理・Googleカレンダー同期・スタッツ/スコア/動画保管の Web アプリです。スマホ UI 最優先。インフラは GCP（Cloud Run + Cloud SQL Postgres + Cloud Storage + Secret Manager + Cloud Tasks）を想定しています。

## リポジトリ構成

```
schedule/
├── app/
│   ├── api/                    # Route Handlers (JSON API)
│   │   ├── auth/[...nextauth]/ # Google OAuth (NextAuth)
│   │   ├── slots/              # 枠 CRUD
│   │   ├── proposals/          # 提案・出欠・OK・確定
│   │   ├── events/             # 確定イベント・更新・中止
│   │   ├── matches/            # 試合記録・Asset・Video
│   │   ├── tasks/sync-calendar/# Cloud Tasks → カレンダー同期 worker
│   │   └── public/teams/[publicId]/  # 外部向け（slots, proposals, THEIR ok）
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/                 # 共通 UI（今後追加）
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── auth.ts                 # セッション取得・OWNER チェック
│   ├── auth-google.ts          # Google ログイン時の User/Team upsert
│   ├── api-response.ts         # apiError / apiSuccess
│   ├── crypto.ts               # refresh token 暗号化 (AES-GCM)
│   ├── tasks.ts                # Cloud Tasks enqueue（同期タスク）
│   ├── google-calendar.ts      # カレンダー API（サブカレンダー作成・イベント upsert/delete）
│   ├── zod/
│   │   └── schemas.ts          # API 入出力の zod スキーマ
├── prisma/
│   ├── schema.prisma           # 全モデル定義
│   └── seed.ts                 # 初期 Team/User（任意）
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env` を作成し、以下を設定してください。

- `DATABASE_URL` … PostgreSQL の接続文字列（Cloud SQL またはローカル）
- `NEXTAUTH_SECRET` … ランダムな文字列（32 文字以上）
- `NEXTAUTH_URL` … アプリの URL（開発時は `http://localhost:3000`）
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` … Google Cloud で OAuth 2.0 クライアントを作成し、Calendar API を有効化
- `ENCRYPTION_KEY` … 64 文字の hex（32 bytes）。生成例:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. DB マイグレーション

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. シード（任意）

```bash
npm run db:seed
```

### 5. 起動

```bash
npm run dev
```

- トップ: `http://localhost:3000`
- ログイン: Google でサインインすると、初回は Team + User (OWNER) が自動作成されます。

## 主な API 一覧

| メソッド | パス | 説明 |
|----------|------|------|
| GET/POST | `/api/auth/...` | NextAuth（Google） |
| GET/POST | `/api/slots` | 枠一覧・作成 |
| GET/PATCH | `/api/slots/[id]` | 枠詳細・更新 |
| GET | `/api/public/teams/[publicId]/slots` | 外部: OPEN 枠一覧 |
| POST | `/api/proposals` | 提案作成 |
| GET/PATCH | `/api/proposals/[id]` | 提案詳細・更新 |
| PUT/GET | `/api/proposals/[id]/availability` | 出欠入力・取得 |
| POST | `/api/proposals/[id]/ok` | 自チーム OK (OUR) |
| POST | `/api/proposals/[id]/confirm` | 確定（OWNER）→ Event 作成 + 同期タスク |
| GET/PATCH | `/api/events/[id]` | イベント詳細・更新（OWNER） |
| POST | `/api/events/[id]/cancel` | 中止（OWNER） |
| POST | `/api/tasks/sync-calendar` | Cloud Tasks 用 worker（UPSERT/DELETE） |
| GET/POST | `/api/matches` | 試合記録一覧・作成 |
| GET | `/api/matches/[id]` | 試合記録詳細 |
| POST | `/api/matches/[id]/assets` | 画像/PDF URL 登録 |
| POST | `/api/matches/[id]/videos` | YouTube リンク登録 |
| POST | `/api/public/teams/[publicId]/proposals` | 外部: 提案作成 |
| POST | `/api/public/teams/[publicId]/proposals/[id]/ok` | 外部: THEIR OK |

## 外部向けページ（ログイン不要）

- 未決定枠一覧: `/t/[teamPublicId]/slots`（要実装: 上記 API を利用）
- 提案作成: 同上から「この枠で提案」「日時を入力して提案」

## 注意事項

- タイムゾーンは Asia/Tokyo。DB は `timestamptz` で保持し、表示は JST で行います。
- カレンダー同期は Cloud Tasks でユーザーごとに非同期実行します。`CLOUD_TASKS_SYNC_CALENDAR_URL` に worker の URL を設定し、本番では OIDC で認証してください。
- スタッツ/PDF のアップロードは、Cloud Storage の signed URL を発行する API を別途実装し、クライアントが PUT した後に `/api/matches/[id]/assets` で `type` と `url` を登録する想定です。

## ライセンス

（必要に応じて記載）
