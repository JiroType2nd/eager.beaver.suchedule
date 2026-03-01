import Link from 'next/link';
import { APP_NAME, APP_PURPOSE } from '@/lib/branding';
import { HomePageClient } from './HomePageClient';

/**
 * ホームページ。アプリ名・目的はサーバー描画で初期HTMLに含め、
 * 審査ボット（JS未実行）でも「目的の説明」と「アプリ名」が確実に取得できるようにする。
 */
export default function HomePage() {
  return (
    <main className="min-h-screen pb-24 bg-navy-900 font-brand">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* サーバー描画: 審査で必ず見られるよう初期HTMLにアプリ名・目的を含める */}
        <header className="mb-6 pb-4 border-b border-navy-700/50">
          <h1 className="text-lg font-bold text-white">{APP_NAME}</h1>
          <p className="text-sm text-slate-400 mt-1">
            <strong className="text-slate-300">アプリの目的：</strong>
            {APP_PURPOSE}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            本アプリは、チームの活動スケジュール共有・出欠管理・Googleカレンダーとの同期を目的としています。
          </p>
        </header>

        <HomePageClient />
      </div>

      <footer className="max-w-lg mx-auto px-4 py-6 mt-8 border-t border-navy-700/50">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <Link href="/terms" className="text-slate-400 hover:text-gold-400 no-underline transition">
            利用規約
          </Link>
          <span className="text-navy-600">|</span>
          <Link href="/privacy" className="text-slate-400 hover:text-gold-400 no-underline transition">
            プライバシーポリシー
          </Link>
        </nav>
      </footer>
    </main>
  );
}
