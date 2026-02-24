'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';

type Event = { id: string; title: string };

function NewMatchPageContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';
  const router = useRouter();
  const { status } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [opponentName, setOpponentName] = useState('');
  const [scoreUs, setScoreUs] = useState('');
  const [scoreThem, setScoreThem] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated' || !eventId) return;
    apiGet<Event>(`/api/events/${eventId}`)
      .then(setEvent)
      .catch(() => setEvent(null));
  }, [status, eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      setError('eventIdが必要です');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          opponentName: opponentName.trim(),
          scoreUs: scoreUs ? parseInt(scoreUs, 10) : null,
          scoreThem: scoreThem ? parseInt(scoreThem, 10) : null,
          memo: memo.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '作成に失敗しました');
      router.push(`/matches/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">ログインが必要です</p>
      </main>
    );
  }

  if (!eventId) {
    return (
      <main className="min-h-screen p-4">
        <Link href="/" className="text-blue-600 text-sm">← ホーム</Link>
        <p className="text-gray-500 mt-4">イベントを指定してください（/matches/new?eventId=...）</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href={`/team?eventId=${eventId}`} className="text-blue-600 text-sm">← 試合記録一覧</Link>
        <h1 className="text-xl font-bold mt-4 mb-6">試合記録を作成</h1>
        {event && <p className="text-sm text-gray-600 mb-4">{event.title}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">相手チーム名 *</label>
            <input
              type="text"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">自チーム得点</label>
              <input
                type="number"
                min={0}
                value={scoreUs}
                onChange={(e) => setScoreUs(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">相手得点</label>
              <input
                type="number"
                min={0}
                value={scoreThem}
                onChange={(e) => setScoreThem(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? '作成中…' : '作成する'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewMatchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-4"><p className="text-gray-500">読み込み中…</p></main>}>
      <NewMatchPageContent />
    </Suspense>
  );
}
