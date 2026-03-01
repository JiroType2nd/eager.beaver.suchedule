'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

function NewProposalPageContent() {
  const searchParams = useSearchParams();
  const hasSlotIdParam = !!searchParams.get('slotId');
  const router = useRouter();
  const { status } = useSession();
  const [opponentName, setOpponentName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('11:00');
  const [placeName, setPlaceName] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('開始・終了の日時を入力してください');
      return;
    }
    const startAt = new Date(`${startDate}T${startTime}:00+09:00`).toISOString();
    const endAt = new Date(`${endDate}T${endTime}:00+09:00`).toISOString();
    if (new Date(endAt) <= new Date(startAt)) {
      setError('終了は開始より後にしてください');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: 'SELF',
          opponentName: opponentName.trim(),
          startAt,
          endAt,
          placeName: placeName.trim() || undefined,
          placeUrl: placeUrl.trim() || undefined,
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

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href="/slots" className="text-blue-600 text-sm">
          ← 交流戦日程へ
        </Link>
        <h1 className="text-xl font-bold mt-4 mb-6">提案を作成</h1>
        {hasSlotIdParam && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            枠を指定する機能は終了しました。日時と場所を入力して提案を作成してください。
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">相手チーム名 *</label>
            <input
              type="text"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">開始日 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">開始時刻 *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">終了日 *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">終了時刻 *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">場所（任意）</label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="例: ○○体育館"
              className="w-full px-3 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">場所URL（任意）</label>
            <input
              type="url"
              value={placeUrl}
              onChange={(e) => setPlaceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-500"
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
