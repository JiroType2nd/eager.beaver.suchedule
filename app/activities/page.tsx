'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActivitiesNav } from '@/components/ActivitiesNav';
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

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-4">活動日程</h1>
        <ActivitiesNav />

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
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded mb-1">外部募集</span>
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

      {/* FAB（活動登録） */}
      <Link
        href="/activities/new"
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-gold-500 text-navy-900 shadow-lg flex items-center justify-center hover:bg-gold-400 transition z-10"
        title="活動を登録"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </Link>
    </main>
  );
}
