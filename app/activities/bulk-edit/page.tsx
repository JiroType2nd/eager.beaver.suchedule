'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTimeRange, formatActivityTitleWithType } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';
import { ACTIVITY_TYPES } from '@/lib/zod/schemas';
import { VENUE_OPTIONS, VENUE_OTHER } from '@/lib/venue-options';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
};

export default function BulkEditPage() {
  const { status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [placeName, setPlaceName] = useState('');
  const [placeSelectValue, setPlaceSelectValue] = useState('');
  const [activityType, setActivityType] = useState('');
  const [dateShiftDays, setDateShiftDays] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<Activity[]>('/api/activities')
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [status]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === activities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activities.map((a) => a.id)));
    }
  };

  const handlePlaceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPlaceSelectValue(val);
    if (val === VENUE_OTHER) {
      setPlaceName('');
    } else if (val) {
      const opt = VENUE_OPTIONS.find((o) => o.name === val);
      if (opt) setPlaceName(opt.name);
    } else {
      setPlaceName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError('編集する日程を1件以上選択してください');
      return;
    }
    const updates: { placeName?: string; activityType?: string | null; dateShiftDays?: number } = {};
    const finalPlace = placeSelectValue === VENUE_OTHER ? placeName.trim() : placeName.trim();
    if (finalPlace) updates.placeName = finalPlace;
    if (activityType !== '') updates.activityType = activityType || null;
    if (dateShiftDays !== '') {
      const n = parseInt(dateShiftDays, 10);
      if (!Number.isNaN(n)) updates.dateShiftDays = n;
    }
    if (Object.keys(updates).length === 0) {
      setError('変更内容を1つ以上指定してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/activities/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          activityIds: Array.from(selectedIds),
          ...updates,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '更新に失敗しました');
      router.push('/activities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー');
    } finally {
      setSubmitting(false);
    }
  };


  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">
          {status === 'loading' ? '読み込み中…' : 'ログインが必要です'}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href="/activities" className="text-gold-400 hover:text-gold-300 text-sm">← 一覧へ</Link>
        <h1 className="text-xl font-bold text-white mt-4 mb-2">日程を一括で編集</h1>
        <p className="text-sm text-slate-400 mb-6">
          編集する日程を選択し、一括で変更を適用します。
        </p>

        {loading ? (
          <p className="text-slate-400">読み込み中…</p>
        ) : activities.length === 0 ? (
          <p className="text-slate-400 py-8">活動日程がありません</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-red-300 bg-red-500/20 text-sm rounded px-2 py-1">{error}</p>}

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-400">編集する日程を選択</span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-sm text-gold-400 hover:text-gold-300"
                >
                  {selectedIds.size === activities.length ? '全て解除' : '全て選択'}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto border border-navy-700 rounded-lg divide-y divide-navy-700 bg-navy-800/80">
                {activities.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-navy-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{formatActivityTitleWithType(a.title, a.placeName, a.activityType)}</p>
                      <p className="text-sm text-slate-400">{formatDateTimeRange(a.startAt, a.endAt)}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">{selectedIds.size}件選択中</p>
            </div>

            <div className="p-4 bg-navy-800/50 rounded-lg space-y-4 border border-navy-700">
              <h2 className="text-sm font-medium text-slate-400">一括で変更する項目</h2>

              <div>
                <label className="block text-sm text-slate-400 mb-1">実施場所を一括変更</label>
                <select
                  value={placeSelectValue}
                  onChange={handlePlaceSelect}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white"
                >
                  <option value="">変更しない</option>
                  {VENUE_OPTIONS.map((v) => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                  <option value={VENUE_OTHER}>{VENUE_OTHER}</option>
                </select>
                {placeSelectValue === VENUE_OTHER && (
                  <input
                    type="text"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    placeholder="実施場所名を入力"
                    className="w-full mt-2 px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">活動種別を一括変更</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white"
                >
                  <option value="">変更しない</option>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">日付を一括でずらす</label>
                <input
                  type="number"
                  value={dateShiftDays}
                  onChange={(e) => setDateShiftDays(e.target.value)}
                  placeholder="例: 7 で1週間後へ、-1 で1日前へ"
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || selectedIds.size === 0}
              className="w-full py-3 bg-gold-500 text-navy-900 rounded-lg font-medium hover:bg-gold-400 disabled:opacity-50"
            >
              {submitting ? '更新中…' : '一括で更新する'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
