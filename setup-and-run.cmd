@echo off
cd /d "%~dp0"
echo 1. フォルダに移動しました.
echo 2. npm install を実行しています...
call npm install
if errorlevel 1 (
    echo エラー: npm が見つかりません。Node.js をインストールし、PATH に追加してください。
    pause
    exit /b 1
)
echo 3. 開発サーバーを起動しています...
echo    ブラウザで http://localhost:3000 を開いてください。終了は Ctrl+C です.
call npm run dev
pause
