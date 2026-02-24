'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { apiGet } from '@/lib/api-client';

type MatchRecord = {
  id: string;
  opponentName: string;
  scoreUs: number | null;
  scoreThem: number | null;
  memo: string | null;
  event: { id: string; title: string; startAt: string };
  createdBy: { displayName: string };
  assets: { id: string; type: string }[];
  videoLinks: { id: string }[];
};

function TeamPageContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<MatchRecord[]>('/api/matches')
      .then((r) => {
        setRecords(eventId ? r.filter((x) => x.event.id === eventId) : r);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [status, eventId]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4">
        <p className="text-slate-400">
          {status === 'loading' ? '読み込み中…' : 'ログインが必要です'}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={eventId ? `/events/${eventId}` : '/'} className="text-gold-400 hover:text-gold-300 text-sm">
            ← {eventId ? 'イベントに戻る' : 'ホーム'}
          </Link>
          <h1 className="text-xl font-bold text-white">試合記録</h1>
        </div>

        {loading ? (
          <p className="text-slate-400">読み込み中…</p>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">試合記録がまだありません</p>
            {eventId && (
              <Link
                href={`/matches/new?eventId=${eventId}`}
                className="inline-block px-4 py-2 bg-gold-500 text-navy-900 hover:bg-gold-400 rounded-lg"
              >
                試合記録を作成
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((r) => (
              <Link
                key={r.id}
                href={`/matches/${r.id}`}
                className="block p-4 bg-navy-800/80 border-l-4 border-navy-600 rounded-r-xl border border-navy-700/50 rounded-lg shadow-sm"
              >
                <p className="font-medium">vs {r.opponentName}</p>
                <p className="text-sm text-slate-400">{r.event.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {format(new Date(r.event.startAt), 'M/d(E)', { locale: ja })}
                </p>
                {(r.scoreUs != null || r.scoreThem != null) && (
                  <p className="text-sm font-medium mt-2">
                    スコア: {r.scoreUs ?? '-'} - {r.scoreThem ?? '-'}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {r.assets.length > 0 && `画像${r.assets.length}件 `}
                  {r.videoLinks.length > 0 && `動画${r.videoLinks.length}件`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-4"><p className="text-slate-400">読み込み中…</p></main>}>
      <TeamPageContent />
    </Suspense>
  );
}
