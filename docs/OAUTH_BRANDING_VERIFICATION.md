# OAuth ブランディング確認で指摘された問題の対処手順

アプリを公開する際に「ブランディングの確認に関する問題」が表示された場合の対応手順です。

**公式ガイド（参照用）**

- [App Homepage（アプリのホームページ）](https://support.google.com/cloud/answer/13807376?hl=ja) — ホームページの要件・ログイン不要表示・目的の説明・ドメイン確認など
- [App Identity & Branding（アプリのアイデンティティとブランディング）](https://support.google.com/cloud/answer/13804963?hl=ja) — OAuth 同意画面とホームページのアプリ名・ロゴの一致

---

## 指摘されやすい4つの問題と対処（スクリーンショットの順）

### 問題1: ホームページにログインページが表示されます

**指摘例**: 「ホームページが、情報を閲覧するためにユーザーログインを要求している」

**公式の対応方針**（[App Homepage - Your homepage is behind a login page](https://support.google.com/cloud/answer/13807376?hl=ja)）:

- ホームページを更新し、**ログインしなくてもアプリの目的・機能・データの利用目的**が分かるようにする。
- または、OAuth 同意画面のホームページ URL を「ログイン不要でアプリ情報が見られる別の URL」に変更する。

**本リポジトリでの対応**:

- 未ログイン時も、**アプリ名・目的・「このアプリについて」・利用するデータの説明・利用規約・プライバシーポリシーへのリンク**を表示するようにしてあります。ログインボタンは「利用を開始する」として、説明の**後**に配置しています。
- 審査時は、トップページを開くだけでアプリの内容が把握できる状態になっています。

**あなたがやること**:

1. 上記の変更を本番にデプロイする。
2. ログアウトした状態（またはシークレットウィンドウ）で本番 URL を開き、ログインしなくてもアプリの説明とプライバシーポリシーリンクが表示されることを確認する。
3. 問題が解消したら「問題は修正した」を選び、再確認をリクエストする。

---

### 問題2: ホームページでアプリの目的が説明されていません

**指摘例**: 「ホームページでアプリの目的が説明されていません。」

**公式の対応方針**（[App Homepage - Your homepage URL does not display information about the application](https://support.google.com/cloud/answer/13807376?hl=ja)）:

- ホームページに、アプリの**目的・機能・Google ユーザーデータの利用目的**を十分に記載する。

**本リポジトリでの対応**:

- ホームページ上部に**アプリ名**と**目的の一文**を常に表示。未ログイン時は「このアプリについて」で目的・機能・データ利用の説明とプライバシーポリシーへのリンクを表示しています。

**あなたがやること**:

- 変更をデプロイし、本番のトップページで目的が読めることを確認してから、再確認をリクエストする。

---

### 問題3: OAuth 同意画面のアプリ名とホームページのアプリ名が一致していません

**指摘例**: 「OAuth 同意画面で構成されているアプリ名『EagerBeiver運営サイト』が、ホームページに掲載されているアプリ名と一致していません。」

**公式の対応方針**（[App Identity & Branding - Application name on homepage not same as OAuth consent screen](https://support.google.com/cloud/answer/13804963?hl=ja)）:

- OAuth 同意画面のアプリ名と、検証用に提出したホームページ上のアプリ名を**一致**させる。正確で最新の名前で設定し直してから再申請する。

**本リポジトリでの対応**:

- ホームページに **「EagerBeiver運営サイト」** を表示。`layout.tsx` の title / Open Graph も同じ名前に統一しています。

**あなたがやること**:

1. [OAuth 同意画面](https://console.cloud.google.com/apis/credentials/consent) を開く。
2. 「アプリ情報」の **「アプリ名」** を、ホームページに表示している名前と**完全に同じ**（**EagerBeiver運営サイト**）にし、保存する。
3. 表記を変える場合は、OAuth とホームの**両方**を同じ名前にする（1文字でも違うと不一致とみなされます）。

---

### 問題4: ホームページの URL のウェブサイトが登録されていません

**指摘例**: 「ホームページの URL 『https://schedule-78918462248.asia-northeast1.run.app/』 のウェブサイトが登録されていません。」

**公式の対応方針**（[App Homepage - The website you provided as your homepage is not registered to you](https://support.google.com/cloud/answer/13807376?hl=ja)）:

- 提出したホームページの**所有権を確認**する。または、すでに所有権確認済みの別のホームページ URL を提出する。

**やること**: ホームページの**所有権を確認**する（Google に「このサイトを管理している」と証明する）。

**手順（Google Search Console で所有権確認）**:

1. [Google Search Console](https://search.google.com/search-console) にアクセスし、同じ Google アカウントでログインする。
2. **「プロパティを追加」**（または「プロパティを追加」）をクリックする。
3. **「URL プレフィックス」** を選び、ホームページの URL をそのまま入力する。  
   例: `https://schedule-78918462248.asia-northeast1.run.app`
4. **「確認」** をクリックし、表示される**確認方法**のいずれかで所有権を証明する。
   - **HTML タグ**: 表示された `<meta name="google-site-verification" content="..." />` を、Next.js の `app/layout.tsx` の `<head>` 内（`<body>` の直前など）に追加する。既に `metadataBase` がある場合は、`metadata` に `verification: { google: '表示された content の値' }` を追加する方法もある。
   - **HTML ファイル**: 指定されたファイル（例: `google123.html`）をダウンロードし、`public/` に置いてデプロイし、指定の URL が 200 で返るようにする。
5. Search Console で **「確認」** を再度クリックし、成功すれば「所有権の確認が完了しました」と表示される。
6. OAuth 同意画面や Cloud Console の「ブランディング」で、この Search Console で確認した URL をホームページとして登録していることを確認する。

**Next.js で HTML タグ方式を使う場合**（`app/layout.tsx`）:

```ts
// layout.tsx の metadata に追加
export const metadata: Metadata = {
  // ... 既存の title, description など
  verification: {
    google: 'Search Console に表示された content の値（長い英数字）',
  },
};
```

確認用の値は Search Console の「HTML タグ」の手順画面に表示されます。

**HTML ファイルで確認する場合（このプロジェクトでの手順）**:

1. Search Console の「HTML ファイル」で **「ファイルをダウンロード」** をクリックし、表示されているファイル（例: `google651990d3a37a2e8b.html`）をダウンロードする。
2. **そのファイルを、プロジェクトの `public` フォルダのなかにそのまま置く。**  
   例: ファイル名が `google651990d3a37a2e8b.html` なら、  
   配置後のパスは `public/google651990d3a37a2e8b.html` にする。
3. この状態でアプリを **本番にデプロイ** する（Cloud Run など）。  
   Next.js では `public/` 内のファイルがサイトのルート直下で配信されるため、デプロイ後は  
   `https://あなたのサイトのURL/google651990d3a37a2e8b.html` でアクセスできるようになる。
4. ブラウザでその URL を開き、Google の確認用の内容が表示されることを確認する。
5. Search Console の画面に戻り、**「確認」** ボタンをクリックする。
6. **確認が完了しても、この HTML ファイルは削除しない。** 削除すると所有権の確認状態が維持されない場合がある。

---

## 対応後の流れ

1. 上記の **問題1〜4** をすべて対応する。
2. 変更を**本番環境にデプロイ**し、本番 URL で表示を確認する。
3. Google の「ブランディングの確認に関する問題」ダイアログで、**「問題は修正した」** を選択する。
4. **「続行」** をクリックし、**ブランディングの再確認**をリクエストする。
5. 審査完了を待ち、問題が解消したら公開手続きを進める。

「検出された問題は正しくないと思う」場合は、**追加の確認をリクエスト**するオプションを選ぶと、Google 側で再チェックしてもらえます（根拠がある場合に選択）。
