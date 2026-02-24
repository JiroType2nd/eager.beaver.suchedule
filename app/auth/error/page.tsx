import Link from 'next/link';

const MESSAGES: Record<string, string> = {
  Configuration: 'サーバー設定に問題があります。.env の GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / NEXTAUTH_SECRET を確認してください。',
  AccessDenied: 'このアカウントではログインできません。',
  Verification: '認証リンクの有効期限が切れているか、既に使用されています。',
  Callback: 'ログイン処理中にエラーが発生しました。DATABASE_URL が設定されているか、Prisma のマイグレーション（npx prisma migrate dev）を実行しているか確認してください。',
  OAuthAccountNotLinked: 'このメールアドレスは別のログイン方法で既に登録されています。同じアカウントでログインしてください。',
  Default: 'ログイン中にエラーが発生しました。',
};

const REDIRECT_URI_NOTE = 'Google Cloud Console の「認証情報」→ 該当の OAuth 2.0 クライアント →「承認済みのリダイレクト URI」に次を追加してください: http://localhost:3000/api/auth/callback/google';

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const { error, error_description } = await searchParams;
  const message = error ? MESSAGES[error] ?? (error_description || MESSAGES.Default) : MESSAGES.Default;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 pb-24">
      <div className="max-w-md w-full bg-navy-800/80 rounded-xl border border-navy-700 p-6">
        <h1 className="text-lg font-bold text-red-300 mb-2">ログインエラー</h1>
        <p className="text-slate-300 mb-4">{message}</p>
        {error && (
          <p className="text-sm text-slate-500 mb-2">
            エラーコード: {error}
          </p>
        )}
        <p className="text-sm text-slate-400 mb-4 border-t border-navy-600 pt-4 mt-4">
          {REDIRECT_URI_NOTE}
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-gold-500 text-navy-900 rounded-lg no-underline font-medium hover:bg-gold-400"
        >
          トップへ戻る
        </Link>
      </div>
    </main>
  );
}
