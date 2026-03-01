import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | EagerBeiver運営サイト',
  description: 'EagerBeiver運営サイトのプライバシーポリシー',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pb-24 bg-navy-900 font-brand">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6">プライバシーポリシー</h1>
        <p className="text-sm text-slate-400 mb-6">最終更新日: 2025年2月25日</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <p>
              EagerBeiver運営サイト（以下「本サービス」）では、利用者のプライバシーを尊重し、個人情報の取り扱いについて以下のとおり定めます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">1. 収集する情報</h2>
            <p className="mb-2">本サービスでは、以下の情報を収集・利用することがあります。</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Googleアカウントによるログイン時に取得する情報（表示名、メールアドレス、プロフィール画像等）</li>
              <li>活動の出欠登録、スケジュール、チーム・メンバー情報など、本サービスの利用に伴い入力された情報</li>
              <li>アクセスログ、端末情報、Cookie等の技術情報（サービスの提供・改善のため）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">2. 利用目的</h2>
            <p>収集した情報は、以下の目的で利用します。</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 mt-2">
              <li>本サービスの提供・運営・改善</li>
              <li>利用者識別、認証、サポート対応</li>
              <li>お知らせや重要な変更の通知</li>
              <li>不正利用の防止、セキュリティ対策</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">3. 第三者提供</h2>
            <p>
              法令に基づく場合を除き、利用者の同意なく個人情報を第三者に提供することはありません。本サービスの提供に必要な範囲で、データベースやホスティング等の外部サービスを利用する場合があります。その場合、当該事業者のプライバシー方針に従って取り扱います。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">4. データの保存・削除</h2>
            <p>
              利用データは、本サービスの提供に必要な期間保存します。利用者がアカウントの削除や利用停止を希望する場合は、運営者までご連絡ください。法令で保存が義務づけられている場合を除き、合理的な範囲で削除に努めます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">5. お問い合わせ</h2>
            <p>
              本ポリシーに関するお問い合わせは、本サービス内の管理者または運営者までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">6. 改定</h2>
            <p>
              本ポリシーは、必要に応じて改定することがあります。重要な変更がある場合は、本サイト上で告知します。
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-navy-700">
          <Link
            href="/"
            className="text-gold-400 hover:text-gold-300 text-sm no-underline"
          >
            ← ホームへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
