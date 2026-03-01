'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function JoinCompletePage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const teamPublicId = params.teamPublicId as string;
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/join/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ teamPublicId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error?.message ?? '参加処理に失敗しました');
        setDone(true);
        setTimeout(() => router.replace('/'), 2000);
      })
      .catch((e) => setError(e.message));
  }, [status, teamPublicId, router]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-navy-900 font-brand">
        <p className="text-slate-400">チームに参加しています…</p>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-900 font-brand">
        <p className="text-slate-400 mb-4">ログインが必要です</p>
        <Link href={`/join/${teamPublicId}`} className="text-gold-400 hover:text-gold-300 underline">
          招待ページに戻る
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-900 font-brand">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/" className="text-gold-400 hover:text-gold-300 underline">
          ホームへ
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-900 font-brand">
        <p className="text-emerald-400 font-medium mb-2">チームに参加しました！</p>
        <p className="text-sm text-slate-400">ホームへリダイレクトします…</p>
        <Link href="/" className="mt-4 text-gold-400 hover:text-gold-300 underline">
          今すぐホームへ
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-navy-900 font-brand">
      <p className="text-slate-400">チームに参加しています…</p>
    </main>
  );
}
