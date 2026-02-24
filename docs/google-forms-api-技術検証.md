# Google Forms API 技術検証レポート

## 概要

相手チーム向け交流戦日程調整ページにおいて、**選択した候補日程で出欠アンケート用のGoogleフォームを自動作成する**機能の技術検証結果をまとめます。

---

## 実装状況（完了）

- NextAuth に `forms.body` と `drive.file` スコープを追加済み
- `lib/google-forms.ts` でフォーム作成ロジックを実装
- `/api/activities/create-attendance-form` API を実装
- 交流戦日程ページ（/slots）にチェックボックス・「すべて選択」・「選択した日程で出欠フォームを作成」ボタンを追加
- **注意**: 新スコープを有効にするには、一度ログアウトしてから再ログインしてください

Google Forms API を用いて、選択した日程情報を基に出欠フォームを**プログラムで自動作成**することは技術的に可能です。

---

## 1. API概要

### 利用するAPI
- **Google Forms API**（正式名称: Google Workspace Forms API）
- エンドポイント: `https://forms.googleapis.com/v1/forms`（または v1beta）
- 参考: https://developers.google.com/workspace/forms/api/guides

### 主なメソッド
| メソッド | 用途 |
|---------|------|
| `forms.create()` | 新規フォーム作成（タイトルのみで初期作成） |
| `forms.batchUpdate()` | 質問・選択肢の追加・更新 |
| `forms.get()` | フォーム内容・回答の取得 |

---

## 2. 認証・スコープ

### 必要なOAuthスコープ
- `https://www.googleapis.com/auth/forms.body` … フォーム内容の作成・更新
- `https://www.googleapis.com/auth/drive` … フォームはDrive上に保存されるため
- `https://www.googleapis.com/auth/drive.file` … アプリが作成したファイルへのアクセス

### 認証方式
- 既存の **Google OAuth** を使用可能
- 本アプリは既に Google ログイン（`next-auth` + Google Provider）を利用
- **注意**: 相手チーム側はログイン不要で候補日程を閲覧する想定のため、フォーム作成は**自チームのログインユーザー**が行う前提になります
- あるいは、**サービスアカウント**でフォームを作成し、作成者をチーム代表者に設定する運用も検討可能

---

## 3. 出欠フォームの作成フロー

### 想定するフォーム構成
1. **タイトル**: 例「〇〇 vs △△ 交流戦 出欠確認」
2. **質問1（ラジオボタン）**: 候補日程ごとに「4/12(日) 13:00～15:00 @ 浦安市中央公民館 → 参加可否」
   - 選択肢: 出る / 微妙 / 出ない
3. （任意）メールアドレスや氏名の入力項目

### APIでの実装イメージ

```javascript
// 1. フォーム作成
const createRes = await forms.forms.create({
  requestBody: {
    info: { title: '交流戦 出欠確認' }
  }
});

// 2. batchUpdate で各日程の質問を追加
const requests = selectedSchedules.map((s, i) => ({
  createItem: {
    item: {
      title: `${formatDateTimeRange(s.startAt, s.endAt)} @ ${s.placeName}`,
      questionItem: {
        question: {
          choiceQuestion: {
            type: 'RADIO',
            options: [
              { value: '出る' },
              { value: '微妙' },
              { value: '出ない' }
            ]
          }
        }
      }
    },
    location: { index: i }
  }
}));

await forms.forms.batchUpdate({
  formId: createRes.data.formId,
  requestBody: { requests }
});
```

### フォーム共有
- 作成後、`https://docs.google.com/forms/d/{formId}/viewform` のURLを相手チームに共有
- 回答の閲覧は Google Sheets 連携または Forms API の responses 取得で可能

---

## 4. 技術的な考慮事項

| 項目 | 内容 |
|------|------|
| **作成者** | フォームは作成したGoogleアカウントのDriveに保存される。チームの代表者が作成するか、サービスアカウントで作成して権限を渡すかを決める必要あり |
| **スコープ追加** | 既存の NextAuth Google スコープに `forms.body` と `drive` を追加する必要がある |
| **レート制限** | Google API の一般的なクォータに準拠。通常の利用では問題になりにくい |
| **Early Adopter Program** | Forms API は以前「Early Adopter」として提供されていたが、現在は一般利用可能な記載あり（要・最新ドキュメント確認） |

---

## 5. 実装時の選択肢

### A. 自チームログインユーザーがフォーム作成
- 相手チーム向けページに「選択した日程でGoogleフォームを作成」ボタンを設置
- **問題点**: 相手チームはログインしないため、このボタンは自チーム側の画面（例：交流戦日程ページ）に置く必要がある
- あるいは、相手チームが候補を選択 → 自チームが「フォーム作成」を実行、という二段階フロー

### B. 相手チームが選択 → フォームURLを返す
- 相手チームが候補日程をチェックして「出欠フォームを作成」を押す
- この場合、相手チームは**Googleログインしていない**ため、フォーム作成はサーバー側のサービスアカウント等で行う必要がある
- 作成したフォームURLを相手に表示・コピー可能にする

### C. テンプレートフォームの複製
- あらかじめ出欠フォームのテンプレートを用意
- Drive API の `files.copy()` で複製し、質問文だけを差し替える方式
- Forms API の `batchUpdate` よりも実装が単純になる可能性あり

---

## 6. 推奨アクション

1. **スコープ確認**: NextAuth の Google Provider に `forms.body`, `drive` を追加可能か確認
2. **作成者モデル決定**: 自チームユーザー作成 vs サービスアカウント作成のどちらで運用するか決定
3. **PoC実装**: 1日程分の出欠フォームを Forms API で作成する最小実装で動作確認
4. **UI設計**: どこに「フォーム作成」ボタンを配置し、誰が押すか（自チーム / 相手チーム）を仕様として確定

---

## 7. 参考リンク

- [Google Forms API 概要](https://developers.google.com/workspace/forms/api/guides)
- [フォーム作成ガイド](https://developers.google.com/workspace/forms/api/guides/create-form-quiz)
- [フォーム更新（質問追加）](https://developers.google.com/workspace/forms/api/guides/update-form-quiz)
- [forms.create リファレンス](https://developers.google.com/workspace/forms/api/reference/rest/v1beta/forms/create)
