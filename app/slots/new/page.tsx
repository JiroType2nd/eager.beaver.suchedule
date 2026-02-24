'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function NewSlotPage() {
  const { status } = useSession();
  const router = useRouter();
  const [placeName, setPlaceName] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [placeReason, setPlaceReason] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          placeName: placeName.trim(),
          placeUrl: placeUrl.trim() || undefined,
          placeReason: placeReason.trim() || undefined,
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '作成に失敗しました');
      router.push(`/slots/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">
          {status === 'loading' ? '読み込み中…' : 'ログインが必要です'}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/slots" className="text-blue-600 text-sm">← 一覧へ</Link>
          <h1 className="text-xl font-bold">枠を作成</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">場所名 *</label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">場所URL</label>
            <input
              type="url"
              value={placeUrl}
              onChange={(e) => setPlaceUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">体育館の理由メモ</label>
            <textarea
              value={placeReason}
              onChange={(e) => setPlaceReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始 *</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了 *</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
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
