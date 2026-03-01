import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '利用規約 | EagerBeiver運営サイト',
  description: 'EagerBeiver運営サイトの利用規約',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen pb-24 bg-navy-900 font-brand">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6">利用規約</h1>
        <p className="text-sm text-slate-400 mb-6">最終更新日: 2025年2月25日</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">第1条（適用）</h2>
            <p>
              本規約は、EagerBeiver運営サイト（以下「本サービス」）の利用に関する条件を定めるものです。利用者は本規約に同意の上、本サービスをご利用ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">第2条（利用登録）</h2>
            <p>
              本サービスでは、Googleアカウントによる認証により利用登録を行います。利用者は、正確な情報を提供し、登録情報の管理に責任を負うものとします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">第3条（禁止事項）</h2>
            <p className="mb-2">利用者は、次の行為を行ってはなりません。</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>法令または公序良俗に反する行為</li>
              <li>他の利用者または第三者に不利益・損害を与える行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセスまたはこれに類する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">第4条（サービスの変更・終了）</h2>
            <p>
              運営者は、必要に応じて本サービスの内容を変更し、または提供を終了することがあります。利用者に重大な影響がある場合は、合理的な方法で通知するよう努めます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">第5条（免責事項）</h2>
            <p>
              本サービスは現状のまま提供されます。運営者は、本サービスの正確性・完全性・有用性等について保証しません。利用に起因する損害について、運営者は法令に基づく場合を除き責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gold-500 mb-2">第6条（規約の変更）</h2>
            <p>
              運営者は、必要に応じて本規約を変更することがあります。変更後の規約は、本サイトに掲載した時点で効力を生じるものとします。変更後も本サービスを利用した場合、変更に同意したものとみなします。
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
