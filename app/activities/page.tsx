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
  createdBy: { displayName: string };
};

type GuestRecruitment = {
  id: string;
  title: string | null;
  placeName: string;
  level: string;
  capacity: number;
  feeYen: number;
  applicationCount: number;
  isFull: boolean;
  startAt: string;
  endAt: string;
  createdBy: { displayName: string };
};

type ListItem =
  | { type: 'activity'; data: Activity }
  | { type: 'guestRecruitment'; data: GuestRecruitment };

export default function ActivitiesPage() {
  const { status } = useSession();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      apiGet<Activity[]>('/api/activities?upcoming=1').catch(() => []),
      apiGet<GuestRecruitment[]>('/api/guest-recruitments?upcoming=1').catch(() => []),
    ]).then(([activities, recruitments]) => {
      const list: ListItem[] = [
        ...activities.map((a) => ({ type: 'activity' as const, data: a })),
        ...recruitments.map((r) => ({ type: 'guestRecruitment' as const, data: r })),
      ];
      list.sort((a, b) => new Date(a.data.startAt).getTime() - new Date(b.data.startAt).getTime());
      setItems(list);
    }).finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">
          {status === 'loading' ? '読み込み中…' : 'ログインが必要です'}
        </p>
      </main>
    );
  }

  const btnClass = 'px-3 py-2 border border-gold-500/70 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/10';
  const btnPrimaryClass = 'px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-medium hover:bg-gold-400';

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-white">活動日程</h1>
          <div className="flex gap-2 flex-wrap">
            <Link href="/activities/bulk-edit" className={btnClass}>一括編集</Link>
            <Link href="/activities/bulk-attendance" className={btnClass}>一括出欠</Link>
            <Link href="/activities/attendance-matrix" className={btnClass}>マトリックス</Link>
            <Link href="/activities/calendar" className={btnClass}>カレンダー</Link>
            <Link href="/activities/bulk-calendar" className={btnClass}>カレンダーに一括追加</Link>
            <Link href="/activities/guest-recruitment/new" className="px-3 py-2 border border-violet-400/70 text-violet-300 rounded-lg text-sm font-medium hover:bg-violet-500/10">ゲスト募集</Link>
            <Link href="/activities/new" className={btnPrimaryClass}>登録</Link>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 py-8">これからの活動日程はありません</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) =>
              item.type === 'activity' ? (
                <Link
                  key={`a-${item.data.id}`}
                  href={`/activities/${item.data.id}`}
                  className="block p-4 bg-navy-800/80 border-l-4 border-navy-600 rounded-r-xl border border-navy-700/50 hover:border-navy-600 transition"
                >
                  <p className="font-medium text-white">{formatActivityTitleWithType(item.data.title, item.data.placeName, item.data.activityType)}</p>
                  <p className="text-sm text-slate-400 mt-1">{formatDateTimeRange(item.data.startAt, item.data.endAt)}</p>
                  <p className="text-sm text-slate-500">{item.data.placeName}</p>
                  <p className="text-xs text-slate-500 mt-1">作成: {item.data.createdBy.displayName}</p>
                </Link>
              ) : (
                <Link
                  key={`g-${item.data.id}`}
                  href={`/activities/guest-recruitment/${item.data.id}`}
                  className="block p-4 bg-violet-500/10 border-l-4 border-violet-500 rounded-r-xl border border-violet-500/30 hover:border-violet-400/50 transition"
                >
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded mb-1">ゲスト募集</span>
                  <p className="font-medium text-white">{item.data.title || item.data.placeName}</p>
                  <p className="text-sm text-slate-400 mt-1">{formatDateTimeRange(item.data.startAt, item.data.endAt)}</p>
                  <p className="text-sm text-slate-500">{item.data.placeName}</p>
                  <p className="text-xs text-violet-300 mt-1">
                    {item.data.level}　{item.data.applicationCount}/{item.data.capacity}名　{item.data.feeYen === 0 ? '無料' : `${item.data.feeYen}円`}
                    {item.data.isFull && '（満員）'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">作成: {item.data.createdBy.displayName}</p>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
