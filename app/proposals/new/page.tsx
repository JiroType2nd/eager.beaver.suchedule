'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { formatDateTimeRange } from '@/lib/date-utils';

type Slot = { id: string; startAt: string; endAt: string; placeName: string };

function NewProposalPageContent() {
  const searchParams = useSearchParams();
  const slotId = searchParams.get('slotId') ?? '';
  const router = useRouter();
  const { status } = useSession();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [opponentName, setOpponentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated' || !slotId) return;
    apiGet<Slot>(`/api/slots/${slotId}`)
      .then(setSlot)
      .catch(() => setSlot(null));
  }, [status, slotId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: 'SELF',
          slotId,
          opponentName: opponentName.trim(),
          startAt: slot!.startAt,
          endAt: slot!.endAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '作成に失敗しました');
      router.push(`/proposals/${data.id}`);
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

  if (slotId && !slot) {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href={slotId ? `/slots/${slotId}` : '/'} className="text-blue-600 text-sm">
          ← {slotId ? '枠に戻る' : 'ホーム'}
        </Link>
        <h1 className="text-xl font-bold mt-4 mb-6">提案を作成</h1>
        {slot && (
          <>
            <p className="text-sm text-gray-600 mb-4">{slot.placeName}</p>
            <p className="text-sm text-gray-500 mb-4">{formatDateTimeRange(slot.startAt, slot.endAt)}</p>
          </>
        )}

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
          <button
            type="submit"
            disabled={submitting || !slot}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? '作成中…' : '作成する'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewProposalPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-4"><p className="text-gray-500">読み込み中…</p></main>}>
      <NewProposalPageContent />
    </Suspense>
  );
}
