# OAuth スコープ一覧と必要性

本アプリで Google OAuth に要求しているスコープと、それぞれの使用箇所・必要性を整理したドキュメントです。

---

## 一覧（すべて必要）

| スコープ | 用途 | 使用箇所 | 削除した場合 |
|----------|------|----------|----------------|
| `openid` | サインイン識別（Google sub 取得） | NextAuth JWT コールバック、`ensureUserByGoogleSub` | ログイン・ユーザー識別ができない |
| `email` | メールアドレス取得 | `lib/auth-options.ts` → `User.email` に保存 | ユーザーのメールが保存されない |
| `profile` | 表示名（name）取得 | `lib/auth-options.ts` → `User.displayName` に保存 | 表示名が「メンバー」のままになる |
| `https://www.googleapis.com/auth/calendar` | カレンダー一覧・カレンダー作成 | `lib/google-calendar.ts`（calendarList.list, calendars.insert） | カレンダー連携が動かない |
| `https://www.googleapis.com/auth/calendar.events` | イベントの作成・更新・削除 | `lib/google-calendar.ts`（events.insert/update/delete） | 活動を Google カレンダーに同期できない |

---

## 詳細

### サインイン・ユーザー情報（Sensitive / 未検証警告の主因）

- **openid**  
  - NextAuth が Google の sub（一意ID）を取得するために必要。削除不可。
- **email**  
  - `lib/auth-options.ts` の JWT コールバックで `profile?.email` を取得し、`ensureUserByGoogleSub(..., email)` 経由で `User.email` に保存。メールを表示・連絡に使うなら必須。
- **profile**  
  - 同上で `profile?.name` を `displayName` として保存。削除すると表示名が取れず「メンバー」固定になる。

これらは Google の「プライベートな情報へのアクセス」として扱われるため、検証・ブランディングが完了していても警告が出ることがある。機能を維持するならスコープは減らせない。

### カレンダー連携

- **calendar**  
  - `lib/google-calendar.ts` で  
    - `calendar.calendarList.list()`（既存「バスケ」カレンダー検索）  
    - `calendar.calendars.insert()`（無い場合は新規作成）  
  に使用。カレンダーリソース自体の操作に必要。
- **calendar.events**  
  - 同上で  
    - `calendar.events.insert`  
    - `calendar.events.update`  
    - `calendar.events.delete`  
  に使用。イベントの作成・更新・削除に必要。

両方とも実際に使っているため、どちらも必要。`calendar` のみではイベント操作の権限が足りず、`calendar.events` のみではカレンダー一覧・作成ができない。

---

## 削除したスコープ（参考）

- **forms.body** / **drive.file** … 出欠確認用 Google フォーム作成機能で使用していたが、UI から該当機能を削除したため、スコープおよび関連 API・`lib/google-forms.ts` を削除済み（2025年頃）。

---

## 削除できるスコープ

**なし。** 上記はいずれも該当機能で実際に使用しており、削除するとその機能が動かなくなります。

---

## 運用メモ

- Cloud Console の「OAuth 同意画面」→ スコープ／データアクセスには、**上記すべてのスコープ**を登録しておく必要がある。
- 実際の判定は「OAuth リクエスト時に送る `scope` パラメータ」で行われるため、コード側（`lib/auth-options.ts`）の指定と Console の登録を一致させる。
- スコープを追加・削除した場合は、本ドキュメントと `lib/auth-options.ts` のコメントを合わせて更新すること。
