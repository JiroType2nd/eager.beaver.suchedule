# GCP 本番デプロイガイド（初心者向け）

このドキュメントでは、現在ローカルで動かしている「交流戦スケジュール」アプリを **Google Cloud Platform (GCP)** にアップロードして本番環境で動かすまでの流れと、**今後の開発の進め方**（ローカル開発 → GCP デプロイ）を整理します。

---

## 月額コストの目安

このアプリを GCP で動かす場合の**おおよその月額**です（為替・料金改定で変動します）。

| サービス | 内容 | 月額の目安（USD） | 備考 |
|----------|------|-------------------|------|
| **Cloud Run** | アプリ本体 | **$0〜5 程度** | 無料枠：毎月 450,000 GiB秒・240,000 vCPU秒。アクセスが少なければほぼ無料。 |
| **Cloud SQL** (PostgreSQL) | 本番DB | **$10〜15 程度** | 最小構成（共有 vCPU・0.6〜1.7GB メモリ・10GB ストレージ）。東京リージョンはやや高め。 |
| **Secret Manager** | 環境変数・秘密情報 | **$0 程度** | 無料枠：アクティブなシークレット 6 バージョン・アクセス 1 万回/月。小規模なら収まる。 |
| **Cloud Tasks** | カレンダー同期（任意） | **$0〜1 程度** | 無料枠あり。使わなければ $0。 |
| **Cloud Storage** | 画像・PDF 等（利用時） | **$0〜2 程度** | 保存量・転送量に応じて。使わなければ $0。 |

**合計の目安**

- **最小構成（Cloud Run + Cloud SQL + Secret Manager のみ）**: **月額 約 $10〜20（約 1,500〜3,000 円）**
- アクセスが少なく無料枠内に収まれば、**実質的な固定費は Cloud SQL の約 $10〜15/月**が中心になります。

**補足**

- 新規アカウントには **$300 分の無料クレジット**（90 日間）があり、その期間は上記も含めて請求されません。
- 料金の詳細は [Cloud 料金計算ツール](https://cloud.google.com/products/calculator) で見積もれます。
- 本番運用後は「予算アラート」を設定しておくと、想定外の請求を防ぎやすくなります。

### Cloud SQL 以外で費用を抑える（外部 PostgreSQL）

**はい、代替することで月額を抑えられます。** アプリは PostgreSQL 互換の DB に `DATABASE_URL` で接続するだけなので、GCP 外のマネージド PostgreSQL を使えば、DB の固定費を **$0〜数ドル** にできます。

| サービス | 無料枠・低価格の目安 | 備考 |
|----------|----------------------|------|
| **[Neon](https://neon.tech)** | **無料枠あり**（クレジットカード不要）<br>0.5 GB ストレージ、100 CU-hours/月/プロジェクト、5 分でスリープ | サーバーレス PostgreSQL。小規模・個人利用なら無料枠で収まりやすい。 |
| **[Supabase](https://supabase.com)** | **無料枠あり**<br>500 MB DB、2 プロジェクトまで。一定期間未使用で一時停止あり | PostgreSQL ベース。認証・ストレージ等も使えるが、今回は DB だけ利用可能。 |
| **[Railway](https://railway.app)** | 無料クレジット $5（新規）のほか、無料プランで月 $1 クレジット | Postgres は従量課金。常時起動だと $1 を超える可能性あり。 |

**使い方のイメージ**

1. Neon または Supabase で PostgreSQL プロジェクトを作成する。
2. 接続文字列（Connection string）を取得する（SSL 対応の URL）。
3. Cloud Run の環境変数 `DATABASE_URL` にその URL を設定する（Secret Manager に登録してから渡すと安全）。
4. 本番用の Prisma マイグレーションは、ローカルで `DATABASE_URL` を一時的にその URL にしたうえで `npx prisma migrate deploy` を実行するか、CI などで実行する。

**注意点**

- **レイテンシ**: DB が GCP 外（Neon/Supabase のリージョン）にあると、Cloud Run（例: 東京）から見てわずかに遅延がのびる可能性があります。多くの小規模アプリでは問題になりません。
- **Neon**: 無料枠では一定時間アクセスがないとスリープするため、久しぶりのアクセスで 1 回目が少し遅く感じることがあります。
- **Supabase 無料**: 非アクティブでプロジェクトが一時停止することがあります。再開はダッシュボードから可能です。
- **セキュリティ**: 接続は必ず **SSL 有効**（URL に `?sslmode=require` など）にし、`DATABASE_URL` は Secret Manager や環境変数で管理し、リポジトリにコミットしないでください。

**まとめ**

- **できるだけ費用を抑えたい**: Neon または Supabase の無料枠で PostgreSQL を用意し、アプリはこれまで通り Cloud Run にデプロイ。DB 月額を **$0** にできる。
- **GCP だけで完結させたい・レイテンシを最小にしたい**: Cloud SQL のまま（月 $10〜15 程度）。

### Firestore は難しいか？

**はい、このプロジェクトでは Firestore への乗り換えはかなり大変です。**

| 理由 | 説明 |
|------|------|
| **データモデルが違う** | 今は **リレーショナル DB**（Team → User → Slot → Proposal → Event などの関連）。Firestore は **NoSQL のドキュメント DB** で、テーブル・JOIN・外部キーがなく、コレクション／ドキュメントで設計し直す必要があります。 |
| **Prisma が使えない** | Prisma は Firestore の公式対応をしていません。Firestore を使うなら、**Prisma をやめて Firestore SDK**（`@google-cloud/firestore` など）で全部書き直す必要があります。 |
| **書き換え範囲が大きい** | `prisma.team.findMany()` や `include` で取っている処理が、API ルート・lib 全体にたくさんあります。これらを「どのコレクションを読むか」「関連データはどう取るか」に合わせて**すべて自前で実装**する必要があります。 |
| **トランザクション・一貫性** | 複数テーブルをまたぐ処理（例：提案の確定で Event 作成＋Proposal 更新）は、Firestore のトランザクション API で組み直す必要があり、設計も変わります。 |

**Firestore が向いているケース**

- 最初から **ドキュメント型**（1 ドキュメント＝1 単位で読む・書く）で設計するアプリ。
- **リアルタイム同期**（クライアントが DB の変更を即反映）を主に使うアプリ。
- リレーションが少なく、**コレクション単位の CRUD** で済むようなシンプルなデータ。

**このアプリの場合**

- チーム・ユーザー・枠・提案・イベント・出欠・カレンダー連携など、**関連が多く、リレーショナルな設計**になっているため、Firestore に合わせて設計し直すと工数が大きくなります。
- **費用だけ抑えたい**なら、**Neon / Supabase で PostgreSQL を無料枠で使う**方が、コード変更がほぼ不要で現実的です。

---

## 1. 全体の流れ（ローカル → 本番）

```
[今] ローカル開発
  └─ PC 上で npm run dev、Neon（PostgreSQL）、.env で DATABASE_URL に Neon の接続文字列を設定

        ↓ 本番移行の準備

[Step 1] GCP プロジェクト・課金の準備
[Step 2] 本番用データベース（Cloud SQL）の作成
[Step 3] 環境変数・秘密情報の管理（Secret Manager）
[Step 4] アプリのコンテナ化（Docker）と Cloud Run へデプロイ
[Step 5] ドメイン・HTTPS（任意）
[Step 6] カレンダー同期（Cloud Tasks）の設定（任意）

        ↓

[本番] GCP 上でアプリが動作
  └─ ユーザーはブラウザで本番 URL にアクセス
```

**重要**: 一度に全部やる必要はありません。まずは **Step 1〜4** まで（アプリを Cloud Run で動かす＋DB に接続）を目標にすると分かりやすいです。

**Neon で DB を用意する場合**: Step 2（Cloud SQL）は不要です。**[docs/NEON_SETUP.md](./NEON_SETUP.md)** の手順で Neon プロジェクトを作成し、接続文字列を取得してください。その後、Step 3 でその `DATABASE_URL` を Secret Manager に登録し、Step 4 で Cloud Run に渡します。

---

## 2. 各ステップの解説

### Step 1: GCP プロジェクト・課金の準備

1. **Google Cloud のアカウント**  
   - まだなら [Google Cloud](https://cloud.google.com/) でアカウント作成。
2. **プロジェクト作成**  
   - [Cloud Console](https://console.cloud.google.com/) → プロジェクトを作成（例: `eagerbiever-schedule`）。
3. **課金の有効化**  
   - プロジェクトに課金をリンク（無料枠内でも課金アカウントの登録は必要です）。
4. **必要な API の有効化**  
   - **Cloud Run API**（必須）  
   - **Secret Manager API**（必須）  
   - Cloud SQL Admin API（**Neon の場合は不要**。Cloud SQL を使う場合のみ）  
   - （カレンダー同期を使う場合）Cloud Tasks API  

コンソールの「API とサービス」→「ライブラリ」で上記を検索して「有効にする」をクリックします。

---

### Step 2: 本番用データベースの用意（Cloud SQL または Neon）

本番では **PostgreSQL** が必要です。

- **Neon を使う場合**: **[docs/NEON_SETUP.md](./NEON_SETUP.md)** に従い、Neon でプロジェクトを作成して接続文字列を取得してください。Step 2 の以降（Cloud SQL の作成）はスキップして Step 3 へ進みます。
- **Cloud SQL を使う場合**: 以下を実施します。

1. **Cloud SQL インスタンス作成**  
   - Cloud Console → 「SQL」→「インスタンスを作成」  
   - エンジン: **PostgreSQL**、リージョンは「asia-northeast1（東京）」推奨。  
   - 開発・小規模なら「開発」プリセットで十分です。
2. **データベースとユーザー作成**  
   - インスタンス内に「データベース」（例: `schedule`）と「ユーザー」（パスワードを設定）を作成。  
   - 接続文字列は次の形になります:  
     `postgresql://ユーザー名:パスワード@/schedule?host=/cloudsql/プロジェクト:リージョン:インスタンス名`
3. **接続文字列**  
   - このプロジェクトは `prisma/schema.prisma` を **PostgreSQL 統一**にしているため、Neon でも Cloud SQL でも、**接続文字列（DATABASE_URL）を切り替えるだけで**利用できます。

ここで得た **接続文字列** は、Step 3 で Secret Manager に登録し、Step 4 の Cloud Run に渡します。

---

### Step 3: 環境変数・秘密情報の管理（Secret Manager）

本番では **パスワードや API キーをコードに書かず**、GCP の **Secret Manager** に保存し、Cloud Run から参照します。

1. **Secret Manager に登録するシークレット一覧**  
   次の「名前」でシークレットを作成し、それぞれ「値」を貼り付けます。値はローカルの `.env` や Neon ダッシュボードから取得します。

   | シークレット名 | 値の内容 | 備考 |
   |----------------|----------|------|
   | `DATABASE_URL` | Neon の接続文字列（Pooled、`?sslmode=require` 付き） | Neon ダッシュボード「Connect」でコピー |
   | `NEXTAUTH_SECRET` | 32 文字以上のランダム文字列 | 本番用に新規生成推奨（例: `openssl rand -base64 32`） |
   | `NEXTAUTH_URL` | 本番の URL（例: `https://あなたのサービス名.run.app`） | **Step 4 で Cloud Run 作成後に確定**。仮で `https://localhost` を入れ、後で更新しても可 |
   | `GOOGLE_CLIENT_ID` | Google OAuth のクライアント ID | ローカルと同じで可（本番 URL をリダイレクト URI に追加する必要あり） |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth のクライアントシークレット | ローカルと同じで可 |
   | `ENCRYPTION_KEY` | 64 文字の英数字（hex）。例: 32 bytes を hex で | 本番用に新規生成推奨（例: `openssl rand -hex 32`） |

2. **手順**  
   - [Cloud Console](https://console.cloud.google.com/) → 対象プロジェクトを選択  
   - 左メニュー「**セキュリティ**」→「**Secret Manager**」（または検索で「Secret Manager」）  
   - 「**シークレットを作成**」をクリック  
   - **名前**: 上表のシークレット名をそのまま入力（例: `DATABASE_URL`）。**環境変数名と一致させると後で Cloud Run でマウントしやすいです。**  
   - **シークレットの値**: 値（接続文字列やパスワード）を貼り付け  
   - 「**作成**」で保存  
   - 上表の 6 個すべて同じ手順で作成  

3. **手順（Cursor 上から実行する場合）**  
   プロジェクトに `scripts/gcp-secrets-upload.mjs` を用意しています。**gcloud がインストール済み**で、**ログインとプロジェクト設定が済んでいる**状態で、次のどちらかを実行すると、Secret Manager に一括登録できます。

   ```bash
   # プロジェクト ID を引数で渡す
   npm run gcp:secrets -- あなたのGCPプロジェクトID

   # または先に gcloud でプロジェクトを設定してから
   gcloud config set project あなたのGCPプロジェクトID
   npm run gcp:secrets -- あなたのGCPプロジェクトID
   ```

   - `.env` から `DATABASE_URL`・`GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET` を読み取ります。  
   - `NEXTAUTH_SECRET` と `ENCRYPTION_KEY` は**本番用に新規生成**して登録します。  
   - `NEXTAUTH_URL` は仮で `https://localhost` を登録します。Step 4 で Cloud Run の URL が分かったら、Secret Manager のコンソールで該当シークレットを編集して本番 URL に更新してください。  
   - 未ログインの場合は先に `gcloud auth login` を実行してください。

4. **補足**  
   - 本番用の Cloud Run サービスでは「**Secret Manager のシークレットを環境変数としてマウント**」する設定にすると、アプリは `process.env.DATABASE_URL` などで参照できます。  
   - `NEXTAUTH_URL` は、Step 4 で Cloud Run をデプロイしたあとで「このサービスの URL」が分かります。その時点で Secret Manager の `NEXTAUTH_URL` を編集して本番 URL に更新し、Cloud Run を再デプロイするか、環境変数を再保存すれば反映されます。  
   - Google OAuth を使う場合、本番 URL を「認証情報」→ 該当 OAuth 2.0 クライアントの「リダイレクト URI」に `https://あなたのサービス.run.app/api/auth/callback/google` のように追加してください。

5. **重要：GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET は「1行だけ」で登録**  
   Secret Manager に貼り付ける値は**改行や2行目を含めない**でください。コンソールで貼り付けた際に、**2行目以降の文字（別のラベルや説明文など）が一緒に入っていると**、そのまま `client_id` として Google に送られ、**エラー 401 invalid_client（The OAuth client was not found）** の原因になります。値は **1行のみ**（例: `78918462248-xxxx.apps.googleusercontent.com`）にし、前後に余計なスペースや改行がないか確認してから保存してください。アプリ側では「1行目のみ採用」する処理を入れていますが、Secret の値自体を1行にしておくことを推奨します。

これで、ローカルの `.env` と同様の設定を、本番では GCP 経由で安全に渡せます。

---

### Step 4: アプリのコンテナ化と Cloud Run へデプロイ

GCP でアプリを動かす代表的な方法が **Cloud Run**（コンテナを動かすサービス）です。

1. **Docker イメージの用意**  
   - プロジェクト直下に **`Dockerfile`** を用意してあります。`next build` → `next start`（standalone）で動く構成です。  
   - **DB**: 開発・本番とも PostgreSQL（Neon 推奨）に統一しています。`schema.prisma` は `provider = "postgresql"`、`url = env("DATABASE_URL")` のままです。本番の Cloud Run には本番用の `DATABASE_URL`（Neon または Cloud SQL）を渡してください。  
   - Node のバージョンは Dockerfile 内で 20 を指定しています。
2. **イメージを GCP に送る**  
   - **Artifact Registry** にリポジトリを作成し、`docker build` → `docker tag` → `docker push` でイメージをアップロード。  
   - または **Cloud Build** を使い、`gcloud builds submit` でソースからクラウド上にビルドして Artifact Registry にプッシュできます（ローカルに Docker がなくても可）。
3. **Cloud Run サービスの作成**  
   - 「Cloud Run」→「サービスの作成」→ 作成したイメージを選択。  
   - 環境変数は Step 3 の Secret Manager から注入。  
   - Cloud SQL に接続する場合は「Cloud SQL 接続」を追加し、Step 2 のインスタンスを指定。
4. **初回の DB マイグレーション**  
   - 本番 DB に対しては、**ローカルから本番の DATABASE_URL を一時的に設定**して `npx prisma migrate deploy` を実行するか、Cloud Run の「ジョブ」や「起動時スクリプト」で一度だけ `prisma migrate deploy` を実行する方法があります。  
   - 本番では `migrate dev` は使わず、`migrate deploy` だけにします。

ここまでできれば、**本番 URL（例: https://xxx.run.app）でアプリにアクセス**できる状態になります。

#### Step 4 を Cursor / ターミナルから実行する（Neon 利用時）

以下はプロジェクト ID `eagerbiever-schedule`、リージョン `asia-northeast1`、Artifact Registry リポジトリ `schedule-repo` を想定した例です。

**事前に必要な権限**  
`gcloud builds submit` で「PERMISSION_DENIED」が出る場合は、GCP コンソールの **IAM** で、自分のアカウントに次のロールを追加してください。  
- **Cloud Build 編集者**（`roles/cloudbuild.builds.editor`）  
- **Storage オブジェクト管理者** または **Storage 管理者**（`roles/storage.objectAdmin` または `roles/storage.admin`）  
→ [IAM のページ](https://console.cloud.google.com/iam-admin/iam?project=eagerbiever-schedule) で「アクセスを付与」→ 自分のメールを選択 → 上記ロールを追加。

**1. API の有効化（未設定なら）**

```bash
gcloud config set project eagerbiever-schedule
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com
```

**2. Artifact Registry リポジトリの作成（未作成なら）**

```bash
gcloud artifacts repositories create schedule-repo --repository-format=docker --location=asia-northeast1 --description="Schedule app Docker images"
```

**3. イメージのビルドとプッシュ**

```bash
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/eagerbiever-schedule/schedule-repo/schedule:latest .
```

**4. Cloud Run にデプロイ（Secret Manager のシークレットを環境変数にマウント）**

```bash
gcloud run deploy schedule --image asia-northeast1-docker.pkg.dev/eagerbiever-schedule/schedule-repo/schedule:latest --region asia-northeast1 --platform managed --allow-unauthenticated --set-secrets=DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,NEXTAUTH_URL=NEXTAUTH_URL:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest
```

デプロイ後、表示されるサービス URL を **NEXTAUTH_URL** 用に使います。Secret Manager で `NEXTAUTH_URL` の値をその URL に更新し、必要なら Cloud Run を「新しいリビジョンでデプロイ」して再デプロイしてください。Google OAuth のリダイレクト URI にも `https://サービスURL/api/auth/callback/google` を追加してください。

**Cloud Run のサービスアカウントに Secret Manager の参照権限が必要です。** デプロイで「Permission denied on secret」が出た場合は、IAM で `PROJECT_NUMBER-compute@developer.gserviceaccount.com` にロール **Secret Manager シークレットアクセス**（`roles/secretmanager.secretAccessor`）を付与してください。

---

### Step 5: ドメイン・HTTPS（任意）

- Cloud Run のデフォルトでは `https://サービス名.run.app` で HTTPS が有効です。  
- 独自ドメインを使う場合は、Cloud Run の「ドメインのマッピング」から設定し、DNS で CNAME などを設定します。

---

### Step 6: カレンダー同期（Cloud Tasks）の設定（任意）

README にある通り、カレンダー同期は **Cloud Tasks** で非同期に実行する想定です。

- `CLOUD_TASKS_SYNC_CALENDAR_URL` に、本番の worker の URL（例: `https://xxx.run.app/api/tasks/sync-calendar`）を設定。  
- Cloud Tasks のキューを作成し、タスク作成時にこの URL を呼ぶようにします。  
- 本番では **OIDC トークン** で worker を保護するのが望ましいです。

まずは Step 4 まで動かし、必要になったら Step 6 を追加する形で問題ありません。

---

### 本番 URL の共有（LINE・スマホ）

#### エラー 400: redirect_uri_mismatch が出る場合

スマホや LINE から開いても、Google ログインで使うコールバック URL は **Cloud Run の本番 URL** と同じです。この URL を Google の「認証情報」に登録する必要があります。

**重要：どの GCP プロジェクトで操作するか**

- GCP には **プロジェクト ID** が付いており、名前が似た別プロジェクトが複数ある場合があります（例: `eagerbeaver-schedule` と `eagerbiever-schedule`）。
- **認証情報（OAuth クライアント ID）は、Cloud Run をデプロイしたのと同じプロジェクト** で設定してください。
- 本番 URL が `https://schedule-78918462248.asia-northeast1.run.app` の場合、その Cloud Run は **プロジェクト ID が `eagerbiever-schedule` のプロジェクト** にあります。
- コンソール左上の **プロジェクト選択** で、**Cloud Run のサービスがある方のプロジェクト**（例: `eagerbiever-schedule`）を選んでから、以下の手順を実行してください。

**手順 1：認証情報ページを開く**

1. [Google Cloud Console](https://console.cloud.google.com/) にログインする。
2. **左上のプロジェクト名**（または「プロジェクトを選択」）をクリックし、**Cloud Run をデプロイしているプロジェクト**（例: `eagerbiever-schedule`）を選択する。
3. 左メニューで **「API とサービス」** → **「認証情報」** を開く。  
   → 直接: [認証情報ページ](https://console.cloud.google.com/apis/credentials)（開いた時点で選ばれているプロジェクトの認証情報が表示されます）。

**手順 2：OAuth クライアント ID を用意する**

- **すでに「OAuth 2.0 クライアント ID」の一覧に 1 件以上ある場合**  
  → その一覧の **クライアント名（例: ウェブクライアント 1）** をクリックし、**手順 3** へ。
- **「表示するOAuth クライアントがありません」と表示されている場合**  
  → 新規作成します。
  1. 画面上部の青いボタン **「+ 認証情報を作成」** をクリックする。
  2. **「OAuth クライアント ID」** を選ぶ。
  3. 初回なら「OAuth 同意画面を設定する必要があります」と出るので、**「OAuth 同意画面」** に進み、**ユーザータイプ「外部」**、**アプリ名**（例: EagerBeiver スケジュール）など必須項目を入力して保存する。戻ったら再度「+ 認証情報を作成」→「OAuth クライアント ID」を選ぶ。
  4. **アプリケーションの種類**: **「ウェブアプリケーション」** を選ぶ。
  5. **名前**: 任意（例: スケジュール本番・ローカル）。
  6. **承認済みのリダイレクト URI** を次の **手順 3** のとおり追加する。
  7. **「作成」** をクリックし、表示された **クライアント ID** と **クライアント シークレット** を控える。  
     → これらを Secret Manager の `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` に登録し、Cloud Run を再デプロイする。

**手順 3：リダイレクト URI を追加する**

1. 「OAuth 2.0 クライアント ID」の編集画面で、**「承認済みのリダイレクト URI」** の **「+ URI を追加」** をクリックする。
2. 次の 2 つを **1 文字も違わず** 入力して追加する。
   - **本番用**（Cloud Run の URL に `/api/auth/callback/google` を付けたもの）  
     `https://schedule-78918462248.asia-northeast1.run.app/api/auth/callback/google`
   - **ローカル開発用**  
     `http://localhost:3000/api/auth/callback/google`
3. **「保存」** をクリックする。

**補足**

- 本番 URL が上記と違う場合（別サービス名・別プロジェクト）は、Cloud Run の「サービス URL」に `/api/auth/callback/google` を付けた文字列を追加してください。
- Secret Manager の **NEXTAUTH_URL** に余計な改行やスペースが入っていないか確認し、必要なら編集して保存したうえで、Cloud Run を再デプロイしてください。

**操作のまとめ**

| やりたいこと | 操作場所 |
|--------------|----------|
| 認証情報の一覧を開く | 左メニュー「API とサービス」→「認証情報」 |
| OAuth クライアントを新規作成 | 認証情報ページ上部の **「+ 認証情報を作成」** → **「OAuth クライアント ID」** |
| 既存クライアントに URI を追加 | 認証情報ページの「OAuth 2.0 クライアント ID」一覧で **クライアント名をクリック** →「承認済みのリダイレクト URI」で「+ URI を追加」 |
| 必ず合わせること | 左上の **プロジェクト** が、Cloud Run をデプロイしたプロジェクト（例: eagerbiever-schedule）になっていること |

---

#### エラー 403: access_denied（「審査プロセスを完了していません」）が出る場合

Google のログイン画面で **「このアプリは現在テスト中で、デベロッパーに承認されたテスターのみがアクセスできます」** と表示され、**403: access_denied** になる場合は、OAuth 同意画面が **テスト** モードのためです。ログインさせたい Google アカウントを **テストユーザー** に追加してください。

**手順：テストユーザーを追加する**

1. [Google Cloud Console](https://console.cloud.google.com/) で、**Cloud Run をデプロイしているプロジェクト**（例: eagerbiever-schedule）を選択する。
2. 左メニュー **「API とサービス」** → **「OAuth 同意画面」** を開く。  
   → 直接: [OAuth 同意画面](https://console.cloud.google.com/apis/credentials/consent?project=eagerbiever-schedule)
3. **「テストユーザー」** セクションで **「+ ADD USERS」**（または「ユーザーを追加」）をクリックする。
4. ログインを許可したい **Google アカウントのメールアドレス**（例: `s158615s@gmail.com`）を入力し、**「追加」** をクリックする。
5. 必要に応じて、複数ユーザーを追加する。**「保存」** をクリックする。

これで、追加したメールアドレスのユーザーは「Google でログイン」できるようになります。**本番で不特定多数に公開する**場合は、**先に検証を申請し、承認されてから**「アプリを公開」してください（下記「公開と検証の正しい順序」を参照）。チーム内・限定利用の場合はテストユーザーのまま運用して問題ありません。

---

#### 「アプリを公開」したらテストユーザーが使えなくなった場合（テストモードに戻す）

**「アプリを公開」ボタンを押したあと**、検証がまだ完了していないと「審査を終えていません」となり、テストユーザーも含めて誰もログインできなくなります。**2つプロジェクトを作る必要はありません。** 同じプロジェクトの OAuth 同意画面で **「テスト」に戻す** ことができます。

**手順：公開済みアプリをテストモードに戻す**

1. [Google Cloud Console](https://console.cloud.google.com/) で、該当プロジェクト（例: eagerbiever-schedule）を選択する。
2. 左メニュー **「API とサービス」** → **「OAuth 同意画面」** を開く。  
   → [OAuth 同意画面](https://console.cloud.google.com/apis/credentials/consent?project=eagerbiever-schedule)
3. 画面上部の **「公開ステータス」** または **「アプリの公開状況」** のあたりを確認する。  
   **「本番環境」（In production）** になっている場合、その近くに **「テストに戻す」** や **「Revert to testing」** などのリンクまたはボタンがあることがあります。クリックして **テスト** に戻す。
4. コンソールのレイアウトによっては、**「OAuth 同意画面」の編集画面**（「アプリ情報」や「スコープ」を編集する画面）を開いたあと、一番下や「公開ステータス」セクションに **「アプリをテストに戻す」** のオプションが表示されます。  
   ※ 表示名は **「Back to testing」**「テストに戻す」など、言語・バージョンにより異なります。
5. テストに戻すと、**テストユーザー** だけが再びログインできるようになります。検証は **テストのまま** 申請できます。

**公開と検証の正しい順序（テストを維持しながら本番を目指す）**

| 順番 | やること |
|------|----------|
| 1 | **テストモードのまま**運用し、必要な人をテストユーザーに追加する。 |
| 2 | 検証に必要な準備（プライバシーポリシー、アプリ説明、スコープの理由など）を整える。 |
| 3 | **「アプリを公開」は押さずに**、**検証の申請だけ**行う（「検証センター」や OAuth 同意画面から「検証をリクエスト」など）。 |
| 4 | 検証審査中も **テストモードのまま**。テストユーザーは従来どおりログイン可能。 |
| 5 | **検証が承認されたあと**に、初めて **「アプリを公開」** を押す。これで誰でもログイン可能になる。 |

※ 先に「アプリを公開」を押してしまうと、検証未完了の間は「未確認アプリ」となりテストユーザーもブロックされることがあります。**検証申請 → 承認 → 公開** の順で行うと、テストモードを維持したまま審査を進められます。

---

#### LINE でリンクを「デフォルトのブラウザアプリ」で開くには

- 当サイト側から「必ず外部ブラウザで開く」ように制御することはできません。LINE の仕様です。
- **送られた人側**で、次のいずれかで対応できます。
  - LINE 内ブラウザでページを開いた状態で、**メニュー（⋮ や「その他」）→「ブラウザで開く」** を選ぶ（機種・LINE のバージョンにより表示名は異なります）。
  - iPhone の場合: LINE の「設定」→「一般」→「Safariで開く」をオンにすると、リンクを Safari で開ける場合があります。
  - Android の場合: リンクを長押しして「アプリで開く」などから Chrome 等を選べる場合があります。
- 「このリンクはブラウザで開いてください」と一言添えて URL を送ると、受け取り側が迷いにくくなります。

**LINE のリンクプレビュー（タイトル・説明）について**

- タイトルや説明文は、サイトの `<title>` と Open Graph（`og:title` など）から取得されます。本番のレイアウトで `metadata` と `openGraph` を設定しているため、**新規に取得したプレビュー**では「EagerBeiver運営サイト」が表示されます。
- **LINE はリンクプレビューをキャッシュする**ため、一度送った URL のプレビューは、しばらく（数時間〜数日）古いタイトルのままになることがあります。新しいプレビューに更新されない場合は、URL にクエリを1つ付けて別リンクとして送る（例: `https://...run.app/?v=1`）と、LINE が新規取得して新しいタイトルが表示される場合があります。

---

## 3. 「ローカルで開発 → GCP にデプロイ」でよいか？

**はい、そのやり方で問題ありません。** 多くのチームが採用しているパターンです。

- **ローカル**: あなたの PC で `npm run dev` を実行。DB は Neon（PostgreSQL）に接続。個人開発では本番と同じ Neon プロジェクトを使っても問題ありません。  
- **本番**: GCP（Cloud Run）+ Neon（または Cloud SQL）にデプロイし、実際のユーザーには本番 URL だけを共有。

**メリット**

- 開発は自分の環境で完結し、失敗しても本番に影響しない。  
- 本番は GCP がスケール・バックアップ・監視をある程度面倒見てくれる。  
- 開発・本番とも **PostgreSQL（Neon）に統一**しているため、同じ schema で運用でき、DB の違いによる不具合を避けやすい。

---

## 4. 今後の開発の進め方（初心者向けフロー）

### 日常の流れ（イメージ）

1. **機能追加・修正**  
   - いつも通りローカルでコードを書く。  
   - `npm run dev` で動作確認（Neon に接続した状態で問題なし）。
2. **コミット・プッシュ**  
   - `git add` → `git commit` → `git push`（GitHub などへ）。
3. **本番へ反映**  
   - **手動**: 手元で `docker build` → イメージを GCP に push → Cloud Run を「新しいイメージでデプロイ」で更新。  
   - **自動（おすすめ）**: Cloud Build と連携し、「main ブランチに push したら自動で build して Cloud Run を更新」するようにすると、初心者でも「push するだけ」で本番反映ができます。
4. **DB スキーマを変えた場合**  
   - 本番用 PostgreSQL に対して、**ローカルで本番の DATABASE_URL を一時的に設定**して `npx prisma migrate dev` でマイグレーションを作成。  
   - 得られたマイグレーションファイルをコミット。  
   - 本番では `npx prisma migrate deploy` を実行（Cloud Run の起動時や、別のジョブで一度だけ）。

### ブランチの考え方（シンプル例）

- **main**: 本番に反映したい状態。  
- **develop や feature/xxx**: 開発用。  
- 「main にマージしたら自動で Cloud Run にデプロイ」にしておくと、運用が楽です。

---

## 5. 開発と本番の DB（Neon に統一）

このプロジェクトでは **開発・本番とも PostgreSQL（Neon 推奨）** に統一しています。

- `schema.prisma` は `provider = "postgresql"`、`url = env("DATABASE_URL")` です。  
- **個人開発**では、開発時も本番デプロイ時も **同じ Neon プロジェクト**（同じ `DATABASE_URL`）を使っても構いません。  
- 本番と開発でデータを分けたい場合は、Neon で別プロジェクトまたは Branch を用意し、`.env`（開発）と Cloud Run の環境変数（本番）で `DATABASE_URL` を切り替えてください。

---

## 6. チェックリスト（本番移行時）

### 6.1 Neon 利用時（Cloud SQL を使わない場合）

Neon のセットアップが済んでいる場合、次の順で進めます。

- [ ] **Step 1** GCP プロジェクト作成・課金有効化  
- [ ] **Step 1** 必要な API 有効化（**Cloud Run**、**Secret Manager**。Cloud SQL は不要）  
- [ ] **Step 2** スキップ（Neon は済んでいる）  
- [ ] **Step 3** Secret Manager に本番用の環境変数を登録（`DATABASE_URL`＝Neon の接続文字列、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`ENCRYPTION_KEY` など）  
- [ ] **Step 4** `Dockerfile` でビルド・動作確認  
- [ ] **Step 4** Artifact Registry にリポジトリ作成 → イメージを push  
- [ ] **Step 4** Cloud Run サービス作成（Secret Manager から環境変数を注入。**Cloud SQL 接続は不要**）  
- [ ] 本番 DB（Neon）はすでに `prisma db push` 済みならそのままで可。マイグレーション運用の場合は `prisma migrate deploy` を実行  
- [ ] 本番 URL でログイン・主要機能の動作確認  
- [ ] （任意）Cloud Build で push から自動デプロイ  
- [ ] （任意）Cloud Tasks + カレンダー同期 worker の設定  

### 6.2 Cloud SQL 利用時

- [ ] GCP プロジェクト作成・課金有効化  
- [ ] 必要な API 有効化（Cloud Run, Cloud SQL, Secret Manager など）  
- [ ] Cloud SQL（PostgreSQL）インスタンス・DB・ユーザー作成  
- [ ] Secret Manager に本番用の環境変数を登録  
- [ ] `schema.prisma` を PostgreSQL 対応に（またはローカルも PostgreSQL に統一）  
- [ ] `Dockerfile` 作成・動作確認  
- [ ] Artifact Registry にイメージを push  
- [ ] Cloud Run サービス作成（Secret・Cloud SQL 接続を設定）  
- [ ] 本番 DB で `prisma migrate deploy` を実行  
- [ ] 本番 URL でログイン・主要機能の動作確認  
- [ ] （任意）Cloud Build で push から自動デプロイ  
- [ ] （任意）Cloud Tasks + カレンダー同期 worker の設定  

---

## 7. 参考リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)  
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)  
- [Secret Manager](https://cloud.google.com/secret-manager/docs)  
- [Prisma - PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)  

---

このガイドは、現在のプロジェクト構成（Next.js + Prisma + NextAuth + Google Calendar）を前提にしています。実際に進める際は、**Step 1 → 2 → 3 → 4** の順で、一つずつ試しながら進めると失敗が少ないです。不明なステップがあれば、その部分（例: 「Cloud Run の作成手順だけ詳しく」）を切り出して説明することもできます。
