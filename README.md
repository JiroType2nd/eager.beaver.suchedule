# schedule

スケジュール管理プロジェクトです。

---

## GitHub にリポジトリを作ってこのプロジェクトを始める手順

### 1. Git の準備

- **Git がまだの場合**: [Git for Windows](https://git-scm.com/download/win) をインストールし、インストール時に「PATH に追加」を選んでおく。
- ターミナルで `git --version` が動けば OK です。

### 2. GitHub で新しいリポジトリを作る

**方法 A: ブラウザで作成（おすすめ）**

1. [GitHub](https://github.com) にログインする。
2. 右上の **+** → **New repository** をクリック。
3. **Repository name** に `schedule`（または好きな名前）を入力。
4. **Public** を選び、**Add a README file** は**付けない**（このフォルダに既に README があるため）。
5. **Create repository** をクリック。
6. 作成後のページに表示される **URL**（例: `https://github.com/あなたのユーザー名/schedule.git`）を控える。

**方法 B: GitHub CLI で作成**

```bash
gh repo create schedule --public --source=. --remote=origin --push
```

（`gh` が未インストールの場合は [GitHub CLI](https://cli.github.com/) をインストールし、`gh auth login` でログインしてください。）

### 3. このフォルダを Git リポジトリにして GitHub にプッシュする

プロジェクトのフォルダ（この `schedule` フォルダ）で、ターミナルを開き、次を順に実行します。

```bash
# リポジトリの初期化
git init

# 全ファイルをステージ
git add .

# 最初のコミット
git commit -m "Initial commit"

# GitHub のリポジトリをリモートに追加（URL は 2 で控えたものに置き換え）
git remote add origin https://github.com/あなたのユーザー名/schedule.git

# main ブランチにプッシュ
git branch -M main
git push -u origin main
```

これで、このプロジェクトが GitHub の新しいリポジトリとして公開され、これからそこで開発を進められます。

---

## 始め方（開発）

（ここにプロジェクトのセットアップ・実行手順を追記してください）

## ライセンス

（必要に応じて記載）
