'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { TIME_OPTIONS } from '@/lib/time-options';

type EventDetail = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
  notes: string | null;
  status: string;
};

export default function EditEventPage() {
  const params = useParams();
  const id = params.id as string;
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [placeName, setPlaceName] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<EventDetail>(`/api/events/${id}`)
      .then((e) => {
        setTitle(e.title);
        const s = new Date(e.startAt);
        const e2 = new Date(e.endAt);
        setDate(s.toISOString().slice(0, 10));
        setStartTime(s.toTimeString().slice(0, 5));
        setEndTime(e2.toTimeString().slice(0, 5));
        setPlaceName(e.placeName);
        setPlaceUrl(e.placeUrl ?? '');
        setNotes(e.notes ?? '');
      })
      .catch(() => setError('イベントの読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, [status, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!date) {
      setError('日程を選択してください');
      return;
    }
    if (!placeName.trim()) {
      setError('場所を入力してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const startAt = new Date(`${date}T${startTime}:00`);
      const endAt = new Date(`${date}T${endTime}:00`);

      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          placeName: placeName.trim(),
          placeUrl: placeUrl.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '更新に失敗しました');
      router.push(`/events/${id}`);
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

  if (loading) {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href={`/events/${id}`} className="text-blue-600 text-sm">← 詳細へ</Link>
        <h1 className="text-xl font-bold mt-4 mb-6">イベントを編集</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日程 *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始時刻 *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了時刻 *</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">場所 *</label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">場所URL（任意）</label>
            <input
              type="url"
              value={placeUrl}
              onChange={(e) => setPlaceUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
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
            {submitting ? '更新中…' : '更新する'}
          </button>
        </form>
      </div>
    </main>
  );
}
