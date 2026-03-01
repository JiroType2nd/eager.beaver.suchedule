# Neon でデータベースを用意する手順

**開発・本番とも** データベースに **Neon**（PostgreSQL）を使う場合のセットアップ手順です（個人開発では同一 Neon プロジェクトで問題ありません）。  
このプロジェクトは Prisma + PostgreSQL に統一しているため、Neon の接続文字列を設定するだけで利用できます。

---

## 1. Neon でプロジェクトを作成

1. **サインアップ・ログイン**  
   [https://neon.tech](https://neon.tech) にアクセスし、GitHub やメールでアカウント作成（無料、クレジットカード不要）。

2. **新規プロジェクト作成**  
   - ダッシュボードで **Create a project** をクリック。  
   - **Project name**: 例）`schedule` または `schedule-prod`。  
   - **Region**: 日本から使う場合は **Asia Pacific (Tokyo)** があるとレイテンシが小さくなります。Tokyo が一覧にない場合は **AWS Asia Pacific 2 (Sydney)** などアジア太平洋のリージョンで問題ありません。  
   - **Create project** で作成。

3. **接続文字列を取得**  
   - プロジェクト作成後、画面に **Connection string** が表示されます。  
   - **Pooled connection**（推奨）を選ぶと、ホスト名に `-pooler` が付いた URL になります。Cloud Run のように接続数が増えやすい環境ではこちらを使います。  
   - 形式の例:  
     `postgresql://ユーザー名:パスワード@ep-xxxx-pooler.リージョン.aws.neon.tech/neondb?sslmode=require`  
   - パスワードは初回のみ表示されるので、**必ずコピーして安全な場所に保存**してください。

---

## 2. 接続文字列を .env に設定

プロジェクトのルートで `.env` を開き（なければ `.env.example` をコピーして作成）、Neon の接続文字列を設定します。

```env
# Neon（PostgreSQL）
DATABASE_URL="postgresql://ユーザー名:パスワード@ep-xxxx-pooler.リージョン.aws.neon.tech/neondb?sslmode=require"
```

- パスワードに `@` や `#` などが含まれる場合は、URL エンコードするか、Neon のダッシュボードでパスワードを再設定してください。  
- **本番用**と**開発用**で別プロジェクトにする場合は、それぞれの `DATABASE_URL` を環境ごとに切り替えてください。  
- **重要**: `.env` は `.gitignore` で除外されています。Git にコミットしないでください（接続文字列・パスワードの漏洩を防ぐため）。

---

## 3. データベースにスキーマを反映する

Neon（PostgreSQL）への初期セットアップは、次のいずれかで行います。

### 方法 A: `prisma db push`（おすすめ・すぐ試したい場合）

Neon の DB が空の状態で、以下を実行します。

```bash
npx prisma db push
```

これで `prisma/schema.prisma` の内容が Neon にそのまま反映されます。  
マイグレーション履歴は残りませんが、個人利用や小規模運用では十分です。

### 方法 B: マイグレーションで管理する（今後の変更を履歴で管理したい場合）

1. **Neon を空の状態**で、`.env` の `DATABASE_URL` を Neon の接続文字列にしたうえで:  
   ```bash
   npx prisma migrate dev --name init_postgres
   ```
   これで PostgreSQL 用の初回マイグレーションが作成され、Neon に適用されます。  
   （初回は `init_postgres` のような名前でマイグレーションを作成します。）

2. **2 回目以降**のスキーマ変更は、これまで通り:  
   ```bash
   npx prisma migrate dev --name 変更内容の名前
   ```
   本番では:  
   ```bash
   npx prisma migrate deploy
   ```

---

## 4. 動作確認

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、ログインや主要画面が問題なく動くか確認します。  
**注意**: `npm run dev` 実行時に「Port 3000 is in use, trying 3001 instead」などと表示された場合は、実際のアドレス（例: `http://localhost:3002`）でアクセスしてください。別のポートで開いているのに `localhost:3000` にアクセスすると 404 になります。  
初回は Neon がスリープから起動するため、1 回目のリクエストが少し遅く感じることがあります。

（任意）シードを流す場合:

```bash
npm run db:seed
```

---

## 5. 本番（Cloud Run）で Neon を使う場合

1. **Secret Manager に登録**  
   GCP の Secret Manager に、本番用の `DATABASE_URL`（Neon の接続文字列）をシークレットとして登録します。

2. **Cloud Run の環境変数に渡す**  
   Cloud Run サービスの「環境変数」で、そのシークレットを `DATABASE_URL` としてマウントします（Secret Manager 連携の設定）。

3. **デプロイ**  
   アプリの Docker イメージをデプロイする際、Prisma は `provider = "postgresql"` のままなので、ビルドはそのままで問題ありません。  
   起動時に `DATABASE_URL` で Neon に接続されます。

4. **マイグレーション**  
   本番 DB へのスキーマ反映は、**ローカルや CI から**本番の `DATABASE_URL` を一時的に設定して実行します。  
   - `npx prisma db push`（方法 A の場合）  
   - または `npx prisma migrate deploy`（方法 B でマイグレーションを運用している場合）  
   Cloud Run のコンテナ起動時に毎回 `migrate` を実行する方法もありますが、起動が遅くなるため、通常はデプロイ前の一度だけ実行する形がおすすめです。

---

## 6. トラブルシューティング

| 現象 | 対処 |
|------|------|
| 接続エラー（SSL 関連） | 接続文字列に `?sslmode=require` が含まれているか確認。Neon は SSL 必須です。 |
| 久しぶりにアクセスすると遅い | 無料枠では数分でスリープします。1 回目のリクエストで起動するため、2 回目以降は速くなります。 |
| パスワードに特殊文字が含まれる | Neon ダッシュボードでパスワードを再設定するか、URL エンコード（例: `@` → `%40`）してから `DATABASE_URL` に設定。 |
| `prisma db push` でエラー | `DATABASE_URL` が Neon の URL になっているか確認してください。 |
| シード後も「活動日程はありません」のまま | ① `.env` の `DATABASE_URL` が Neon の接続文字列になっているか確認。② **開発サーバーを再起動**（`npm run dev` を止めてから再度実行）。③ ブラウザで**一度ログアウトしてから再ログイン**する。 |

---

## 参考リンク

- [Neon ドキュメント - 接続](https://neon.tech/docs/connect/connect-from-any-app)
- [Neon ドキュメント - 接続プール](https://neon.tech/docs/connect/connection-pooling)
- [Prisma - PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
