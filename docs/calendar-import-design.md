# カレンダー一括インポート 設計書

## 1. 概要

活動日程を Google カレンダーに一括インポートする機能について、動作不良の確認と「既にインポート済みのものは重ねてインポートしない」仕様を満たすための設計です。

## 2. 現状

### 2.1 データフロー

- **画面**: `app/activities/bulk-calendar/page.tsx`（Googleカレンダーに一括インポート）
- **API**: `GET /api/activities?upcoming=1` で活動一覧取得 → 選択した各活動に対して `POST /api/activities/[id]/sync-calendar`
- **バックエンド**: `UserActivitySync`（userId + activityScheduleId）で 1 ユーザー・1 活動あたり 1 レコード。`googleEventId` があれば Google Calendar API の **update**、なければ **insert**。

### 2.2 想定される問題点

| 問題 | 内容 |
|------|------|
| インポート失敗が分からない | 一括インポート時に個別 POST が失敗しても、画面上は成功件数しか更新されず、エラー内容が表示されない。 |
| 既にインポート済みが分からない | 一覧に「カレンダー同期状態」が含まれておらず、どの日程が既にインポート済みか判別できない。 |
| 重ねてインポート | バックエンドは upsert のため、同じ活動を再度インポートしても Google 上では 1 件のまま。ただし「既にインポート済みのものはインポート処理をスキップする」方が無駄な API 呼び出しが減り、ユーザー意図に沿う。 |

### 2.3 重複について（バックエンド）

- 同じ「ユーザー + 活動」で 2 回目以降のインポート時は、`UserActivitySync.googleEventId` が入っているため **update** が行われ、Google 上に重複イベントは作成されない。
- ただし「重ねてインポートしない」を仕様として明示するため、**既に SYNCED のものはインポート処理（POST）を呼ばずスキップする** ようにする。

## 3. 設計方針

### 3.1 活動一覧に「カレンダー同期状態」を付与

- **API**: `GET /api/activities` に、現在ログインユーザーに対する `UserActivitySync` の状態を付与する。
  - クエリ: `upcoming=1` のとき、または `withSyncStatus=1` のとき、レスポンスの各活動に `syncStatus`（`'PENDING' | 'SYNCED' | 'FAILED' | null`）と `syncLastError`（`string | null`）を付与する。
- **一括インポート画面**: 取得した活動に `syncStatus === 'SYNCED'` の場合は「インポート済み」等の表示を行い、インポート実行時に **既に SYNCED のものは API を呼ばずスキップ** する。

### 3.2 一括インポートの挙動

- 選択された活動のうち:
  - **syncStatus === 'SYNCED'**: スキップ（POST しない）。「○件は既にインポート済みのためスキップ」として件数表示してもよい。
  - **syncStatus !== 'SYNCED'**（未同期・PENDING・FAILED）: 従来どおり `POST /api/activities/[id]/sync-calendar` を実行。
- 成功件数: 実際に POST して成功した件数。
- 失敗時: 各 POST の `res.ok === false` の場合、`data?.error?.message` を集約し、「○件成功、△件失敗（例: 認証エラー）」のように表示する。

### 3.3 エラー表示の改善

- 各 POST のレスポンスで `!res.ok` のとき、`data?.error?.message` を配列に溜める。
- 一括処理終了後に「失敗した件数」と、代表的なエラーメッセージ（1件または一覧）を表示する。

## 4. 実装タスク一覧

1. **GET /api/activities**  
   - 認証ユーザーに対して、活動一覧に `syncStatus` / `syncLastError` を付与する（`upcoming=1` または `withSyncStatus=1` のとき）。
2. **一括インポート画面 (bulk-calendar)**  
   - 活動一覧で `syncStatus === 'SYNCED'` の行に「インポート済み」表示を付与。
   - インポート実行時: 選択のうち `syncStatus === 'SYNCED'` はスキップし、それ以外のみ POST。
   - スキップ件数・成功件数・失敗件数と、失敗時のエラーメッセージを表示する。
3. **既存の sync-calendar API**  
   - 変更なし（既に upsert で重複は発生しない）。必要に応じてエラーレスポンスの形式を確認。

## 5. まとめ

- **重複防止**: 既に SYNCED の活動は一括インポート時に **API を呼ばずスキップ** する。バックエンドの upsert に加え、フロントで「インポート済み」を表示し、重ねてインポートしないことを明確にする。
- **インポート機能の確認**: 失敗時にエラーメッセージを表示し、必要なら Google 認証やネットワーク状況の確認がしやすくする。

## 6. 開発・本番環境

本機能は **開発環境・本番環境の両方で同一コード** が動作します。環境による分岐はありません。

- **開発**: `npm run dev` で起動。同一の API・画面が利用可能。Google カレンダー連携には `.env` に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `ENCRYPTION_KEY` が必要。ユーザーが Google でログインし、カレンダー連携を許可している必要あり。
- **本番**: デプロイ後、同じく `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `ENCRYPTION_KEY` を設定。OAuth のリダイレクト URI に本番の URL を登録しておくこと。活動→カレンダー同期はブラウザから直接 `POST /api/activities/[id]/sync-calendar` を呼ぶため、Cloud Tasks は不要（Cloud Tasks は提案確定後の **Event** 同期用）。
- **デプロイ**: 既存のビルド・デプロイ手順のまま。本機能用の追加マイグレーションや環境変数は不要（既存の `UserActivitySync` と Google Auth を利用）。
