'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTimeRange, formatActivityTitleWithType } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
};

export default function BulkCalendarPage() {
  const { status } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<Activity[]>('/api/activities?upcoming=1')
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

  const handleBulkImport = async () => {
    if (selectedIds.size === 0) {
      setError('インポートする日程を1件以上選択してください');
      return;
    }
    setError('');
    setImporting(true);
    setSuccessCount(0);
    let count = 0;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        const res = await fetch(`/api/activities/${id}/sync-calendar`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data?.ok) {
          count++;
          setSuccessCount(count);
        }
      } catch {
        // 個別失敗は続行
      }
    }
    setImporting(false);
    setSelectedIds(new Set());
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
        <h1 className="text-xl font-bold text-white mt-4 mb-2">Googleカレンダーに一括インポート</h1>
        <p className="text-sm text-slate-400 mb-6">
          インポートする日程を選択し、一括でGoogleカレンダーに追加します。
        </p>

        {loading ? (
          <p className="text-slate-400">読み込み中…</p>
        ) : activities.length === 0 ? (
          <p className="text-slate-400 py-8">これからの活動日程がありません</p>
        ) : (
          <div className="space-y-4">
            {error && <p className="text-red-300 bg-red-500/20 text-sm rounded px-2 py-1">{error}</p>}
            {successCount > 0 && (
              <p className="text-green-400 text-sm">{successCount}件をGoogleカレンダーに追加しました</p>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-400">インポートする日程を選択</span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-sm text-gold-400 hover:text-gold-300"
              >
                {selectedIds.size === activities.length ? 'すべて解除' : 'すべて選択'}
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
                    disabled={importing}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{formatActivityTitleWithType(a.title, a.placeName, a.activityType)}</p>
                    <p className="text-sm text-slate-400">{formatDateTimeRange(a.startAt, a.endAt)}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">{selectedIds.size}件選択中</p>

            <button
              type="button"
              onClick={handleBulkImport}
              disabled={importing || selectedIds.size === 0}
              className="w-full py-3 bg-gold-500 text-navy-900 rounded-lg font-medium hover:bg-gold-400 disabled:opacity-50"
            >
              {importing ? `インポート中…（${successCount}件完了）` : '選択した日程をGoogleカレンダーにインポート'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
