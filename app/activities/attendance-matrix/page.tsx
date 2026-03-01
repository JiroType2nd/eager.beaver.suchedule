'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ActivitiesNav } from '@/components/ActivitiesNav';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatActivityTitleWithType } from '@/lib/date-utils';
import { getMemberTypeLabel } from '@/lib/members';
import { apiGet } from '@/lib/api-client';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
  createdBy?: { displayName: string };
};

type Member = {
  id: string;
  displayName: string;
  memberType: string;
};

type MatrixData = {
  activities: Activity[];
  members: Member[];
  attendanceMap: Record<string, Record<string, string>>;
  currentUserId?: string;
};

export default function AttendanceMatrixPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<MatrixData>('/api/activities?view=matrix&upcoming=1')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
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

  const currentUserId = data?.currentUserId ?? null;

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-2">日程候補・出欠マトリックス</h1>
        <ActivitiesNav />
        <p className="text-sm text-slate-400 mb-4">
          各自の出欠状況を変更するには名前のリンクをクリックしてください。
        </p>

        {loading ? (
          <p className="text-slate-400">読み込み中…</p>
        ) : !data || data.activities.length === 0 ? (
          <p className="text-slate-400 py-8">これからの活動日程はありません</p>
        ) : (
          <div className="overflow-x-auto border border-navy-700 rounded-r-xl bg-navy-800/80">
            <table className="w-full border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="bg-navy-800/50 border-b border-navy-700">
                  <th className="text-left py-3 px-3 font-medium text-slate-400 sticky left-0 bg-navy-800/50 z-10 min-w-[180px]">
                    日程
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-slate-500 w-12">○</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-500 w-12">△</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-500 w-12">×</th>
                  {data.members.map((m) => (
                    <th
                      key={m.id}
                      className="text-center py-3 px-2 font-medium text-slate-400 min-w-[60px]"
                    >
                      {m.id === currentUserId ? (
                        <Link
                          href="/activities/bulk-attendance"
                          className="text-gold-400 hover:text-gold-300"
                        >
                          {m.displayName}
                        </Link>
                      ) : (
                        <span className="text-slate-400">{m.displayName}</span>
                      )}
                      <span className="block text-xs text-slate-500 font-normal">
                        {getMemberTypeLabel(m.memberType ?? 'PLAYER')}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.activities.map((a) => {
                  const map = data.attendanceMap[a.id] ?? {};
                  const yesCount = Object.values(map).filter((v) => v === 'YES').length;
                  const maybeCount = Object.values(map).filter((v) => v === 'MAYBE').length;
                  const noCount = Object.values(map).filter((v) => v === 'NO').length;
                  const dateStr = format(new Date(a.startAt), 'M/d(E)', { locale: ja });
                  const timeStr = `${format(new Date(a.startAt), 'HH:mm', { locale: ja })}-${format(new Date(a.endAt), 'HH:mm', { locale: ja })}`;
                  return (
                    <tr key={a.id} className="border-b border-navy-700 hover:bg-navy-800/50">
                      <td className="py-2 px-3 sticky left-0 bg-navy-800/80 z-10">
                        <Link href={`/activities/${a.id}`} className="text-gold-400 hover:text-gold-300 block">
                          {dateStr} {timeStr}@{a.placeName}
                        </Link>
                        {a.title && (
                          <span className="text-xs text-slate-500 block truncate max-w-[200px]">
                            {formatActivityTitleWithType(a.title, a.placeName, a.activityType)}
                          </span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2 text-green-400 font-medium">{yesCount}人</td>
                      <td className="text-center py-2 px-2 text-amber-400">{maybeCount}人</td>
                      <td className="text-center py-2 px-2 text-slate-500">{noCount}人</td>
                      {data.members.map((m) => {
                        const ans = map[m.id];
                        return (
                          <td key={m.id} className="text-center py-2 px-2">
                            {ans === 'YES' ? (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                                ○
                              </span>
                            ) : ans === 'MAYBE' ? (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-amber-500/30 text-amber-300 text-xs">
                                △
                              </span>
                            ) : ans === 'NO' ? (
                              <span className="inline-flex w-6 h-6 items-center justify-center text-slate-500 text-xs">
                                ×
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
