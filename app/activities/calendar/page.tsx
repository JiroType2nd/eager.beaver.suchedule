'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { apiGet } from '@/lib/api-client';
import { formatActivityTitleWithType } from '@/lib/date-utils';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
};

export default function ActivitiesCalendarPage() {
  const { status } = useSession();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const from = startOfMonth(currentMonth).toISOString();
    const to = endOfMonth(currentMonth).toISOString();
    apiGet<Activity[]>(`/api/activities?from=${from}&to=${to}`)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [status, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getActivitiesForDay = (d: Date) =>
    activities.filter((a) => isSameDay(parseISO(a.startAt), d));

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const getHeaderBg = (i: number) => (i === 0 ? 'bg-red-500/20 text-red-300' : i === 6 ? 'bg-gold-500/20 text-gold-300' : 'bg-navy-800/50 text-slate-400');
  const getDayCellBg = (d: Date) => {
    const day = d.getDay(); // 0=日, 6=土
    return day === 0 ? 'bg-red-500/10' : day === 6 ? 'bg-gold-500/10' : 'bg-navy-800/80';
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
        <div className="flex justify-between items-center mb-4">
          <Link href="/activities" className="text-gold-400 hover:text-gold-300 text-sm">← 一覧へ</Link>
          <h1 className="text-xl font-bold text-white">活動カレンダー</h1>
          <div className="w-12" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="px-3 py-1 text-gold-400 hover:text-gold-300 text-sm"
          >
            ← 前月
          </button>
          <span className="font-medium text-white">
            {format(currentMonth, 'yyyy年M月', { locale: ja })}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="px-3 py-1 text-gold-400 hover:text-gold-300 text-sm"
          >
            翌月 →
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 py-8">読み込み中…</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px bg-navy-700 rounded-lg overflow-hidden mb-4">
              {weekDays.map((w, i) => (
                <div
                  key={w}
                  className={`p-1 text-center text-xs font-medium ${getHeaderBg(i)}`}
                >
                  {w}
                </div>
              ))}
              {days.map((d) => {
                const dayActivities = getActivitiesForDay(d);
                const isCurrentMonth = isSameMonth(d, currentMonth);
                return (
                  <div
                    key={d.toISOString()}
                    className={`min-h-[70px] p-1 ${getDayCellBg(d)} ${!isCurrentMonth ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block w-6 h-6 text-sm flex items-center justify-center rounded-full ${
                        isSameDay(d, new Date()) ? 'bg-gold-500 text-navy-900' : ''
                      }`}
                    >
                      {format(d, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayActivities.slice(0, 2).map((a) => (
                        <Link
                          key={a.id}
                          href={`/activities/${a.id}`}
                          className="block text-xs truncate px-1 py-0.5 bg-gold-500/20 text-gold-300 rounded hover:bg-gold-500/30"
                        >
                          {formatActivityTitleWithType(a.title, a.placeName, a.activityType)}
                        </Link>
                      ))}
                      {dayActivities.length > 2 && (
                        <span className="text-xs text-slate-500 px-1">
                          +{dayActivities.length - 2}件
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
