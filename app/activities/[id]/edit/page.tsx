'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VENUE_OPTIONS, VENUE_OTHER } from '@/lib/venue-options';
import { ACTIVITY_TYPES } from '@/lib/zod/schemas';
import { TIME_OPTIONS } from '@/lib/time-options';
import { apiGet } from '@/lib/api-client';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
  notes: string | null;
};

export default function EditActivityPage() {
  const params = useParams();
  const id = params.id as string;
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [venueSelectValue, setVenueSelectValue] = useState('');
  const [placeOtherName, setPlaceOtherName] = useState('');
  const [placeOtherUrl, setPlaceOtherUrl] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<Activity>(`/api/activities/${id}`)
      .then((a) => {
        setTitle(a.title ?? '');
        setActivityType(a.activityType ?? '');
        const opt = VENUE_OPTIONS.find((v) => v.name === a.placeName);
        if (opt) {
          setVenueSelectValue(opt.name);
          setPlaceName(opt.name);
          setPlaceUrl(opt.url ?? '');
        } else {
          setVenueSelectValue(VENUE_OTHER);
          setPlaceOtherName(a.placeName);
          setPlaceOtherUrl(a.placeUrl ?? '');
        }
        const s = new Date(a.startAt);
        const e = new Date(a.endAt);
        setDate(s.toISOString().slice(0, 10));
        setStartTime(s.toTimeString().slice(0, 5));
        setEndTime(e.toTimeString().slice(0, 5));
        setNotes(a.notes ?? '');
      })
      .catch(() => setError('活動の読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, [status, id]);

  const handleVenueSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setVenueSelectValue(val);
    if (val === VENUE_OTHER) {
      setPlaceName('');
      setPlaceUrl('');
    } else if (val) {
      const opt = VENUE_OPTIONS.find((o) => o.name === val);
      if (opt) {
        setPlaceName(opt.name);
        setPlaceUrl(opt.url ?? '');
      }
    } else {
      setPlaceName('');
      setPlaceUrl('');
    }
  };

  const isVenueOther = venueSelectValue === VENUE_OTHER;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlace = isVenueOther ? placeOtherName.trim() : placeName.trim();
    if (!finalPlace) {
      setError('実施場所を選択または入力してください');
      return;
    }
    if (!date) {
      setError('日程を選択してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const startAt = new Date(`${date}T${startTime}:00`);
      const endAt = new Date(`${date}T${endTime}:00`);

      const res = await fetch(`/api/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim() || null,
          activityType: activityType || null,
          placeName: finalPlace,
          placeUrl: isVenueOther ? (placeOtherUrl || null) : (placeUrl || null),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '更新に失敗しました');
      router.push(`/activities/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">ログインが必要です</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href={`/activities/${id}`} className="text-gold-400 hover:text-gold-300 text-sm">← 詳細へ</Link>
        <h1 className="text-xl font-bold text-white mt-4 mb-6">活動日程を編集</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-300 bg-red-500/20 text-sm rounded px-2 py-1">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">活動内容</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white"
            >
              <option value="">選択してください</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500"
              placeholder="例: ○○大会、練習会（任意）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">日程 *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">開始時刻 *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">終了時刻 *</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">実施場所 *</label>
            <select
              value={venueSelectValue}
              onChange={handleVenueSelect}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white"
            >
              <option value="">選択してください</option>
              {VENUE_OPTIONS.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
              <option value={VENUE_OTHER}>{VENUE_OTHER}</option>
            </select>
            {isVenueOther ? (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={placeOtherName}
                  onChange={(e) => setPlaceOtherName(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500"
                  placeholder="実施場所名を入力"
                />
                <input
                  type="url"
                  value={placeOtherUrl}
                  onChange={(e) => setPlaceOtherUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500"
                  placeholder="URL（任意）"
                />
              </div>
            ) : placeUrl ? (
              <p className="text-xs text-slate-500 mt-1 truncate">{placeUrl}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">備考</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gold-500 text-navy-900 rounded-lg font-medium hover:bg-gold-400 disabled:opacity-50"
          >
            {submitting ? '更新中…' : '更新する'}
          </button>
        </form>
      </div>
    </main>
  );
}
