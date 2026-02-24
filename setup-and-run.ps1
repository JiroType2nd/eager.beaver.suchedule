# 1. プロジェクトフォルダへ移動
$ProjectDir = $PSScriptRoot
Set-Location $ProjectDir
Write-Host "1. フォルダ: $ProjectDir" -ForegroundColor Cyan

# 2. 依存関係のインストール
Write-Host "2. npm install を実行しています..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: npm が見つかりません。Node.js をインストールし、PATH に追加してください。" -ForegroundColor Red
    exit 1
}

# 3. 開発サーバー起動
Write-Host "3. 開発サーバーを起動しています (npm run dev)..." -ForegroundColor Cyan
Write-Host "   ブラウザで http://localhost:3000 を開いてください。終了は Ctrl+C です。" -ForegroundColor Green
npm run dev
