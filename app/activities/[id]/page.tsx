'use client';

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ActivitiesNav } from '@/components/ActivitiesNav';
import { useEffect, useState } from 'react';
import { formatDateTimeRange, formatActivityTitleWithType } from '@/lib/date-utils';
import { getMemberTypeLabel } from '@/lib/members';
import { apiGet } from '@/lib/api-client';

type Attendance = {
  id: string;
  userId: string;
  answer: string;
  comment: string | null;
  user: { displayName: string; memberType: string };
};

type ActivityDetail = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
  notes: string | null;
  createdBy: { displayName: string };
  attendances: Attendance[];
  noAnswerCount: number;
  attendanceSummaryByRole?: Record<string, { YES: number; MAYBE: number; NO: number; noAnswer: number }>;
};

export default function ActivityDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { status } = useSession();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [myAtt, setMyAtt] = useState<{ answer: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [me, setMe] = useState<{ user: { address: string | null; postalCode: string | null } } | null>(null);

  const load = () => {
    Promise.all([
      apiGet<ActivityDetail>(`/api/activities/${id}`),
      apiGet<{ answer: string } | null>(`/api/activities/${id}/attendance`).catch(() => null),
      apiGet<{ status: string | null }>(`/api/activities/${id}/sync-calendar`).catch(() => ({ status: null })),
      apiGet<{ user: { address: string | null; postalCode: string | null } }>('/api/me').catch(() => ({ user: { address: null, postalCode: null } })),
    ])
      .then(([a, att, sync, m]) => {
        setActivity(a);
        setMyAtt(att);
        setSyncStatus(sync?.status ?? null);
        setMe(m);
        setSyncError(null);
      })
      .catch(() => setActivity(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    load();
  }, [status, id]);

  const syncToCalendar = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/activities/${id}/sync-calendar`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '同期に失敗しました');
      setSyncStatus('SYNCED');
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : '同期に失敗しました');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '削除に失敗しました');
      window.location.href = '/activities';
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const openAccessDirections = () => {
    if (!activity) return;
    const origin = (me?.user?.address?.trim() || me?.user?.postalCode?.trim())
      ? encodeURIComponent([me?.user?.postalCode, me?.user?.address].filter(Boolean).join(' ').trim())
      : null;
    const dest = encodeURIComponent(activity.placeName);
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=transit`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`;
    window.open(url, '_blank');
  };

  const putAttendance = async (answer: 'YES' | 'MAYBE' | 'NO') => {
    setSubmitting(true);
    try {
      await fetch(`/api/activities/${id}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answer }),
      });
      setMyAtt({ answer });
      load();
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

  if (loading || !activity) {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">{loading ? '読み込み中…' : '活動が見つかりません'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <Link href="/activities" className="text-gold-400 hover:text-gold-300 text-sm">← 一覧へ</Link>
          <div className="flex gap-3">
            <Link href={`/activities/${id}/edit`} className="text-gold-400 hover:text-gold-300 text-sm">編集</Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`text-sm ${deleteConfirm ? 'text-red-300 font-medium' : 'text-slate-500'}`}
            >
              {deleting ? '削除中…' : deleteConfirm ? '本当に削除する' : '削除'}
            </button>
          </div>
        </div>
        <ActivitiesNav />
        <h1 className="text-xl font-bold text-white mt-4 mb-2">
          {formatActivityTitleWithType(activity.title, activity.placeName, activity.activityType)}
        </h1>
        <p className="text-sm text-slate-400">{formatDateTimeRange(activity.startAt, activity.endAt)}</p>
        <p className="text-sm text-slate-500">{activity.placeName}</p>
        {activity.placeUrl && (
          <a
            href={activity.placeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 hover:text-gold-300 text-sm block mt-1"
          >
            {activity.placeUrl}
          </a>
        )}
        <button
          type="button"
          onClick={openAccessDirections}
          className="mt-2 w-full py-2 px-4 border border-green-500/70 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/20"
        >
          {me?.user?.address || me?.user?.postalCode
            ? 'アクセス確認（登録住所から電車・バス経路を表示）'
            : 'アクセス確認（会場までの経路を表示）'}
        </button>
        {!me?.user?.address && !me?.user?.postalCode && (
          <p className="text-xs text-slate-500 mt-1">マイページで住所を登録すると、自宅からの経路が表示されます</p>
        )}
        {activity.notes && (
          <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">{activity.notes}</p>
        )}
        <p className="text-xs text-slate-400 mt-2">作成: {activity.createdBy.displayName}</p>

        <div className="mt-4">
          <button
            type="button"
            onClick={syncToCalendar}
            disabled={syncLoading}
            className="w-full py-2 px-4 border border-gold-500/70 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/20 disabled:opacity-50"
          >
            {syncLoading ? '同期中…' : syncStatus === 'SYNCED' ? '✓ Googleカレンダーに登録済み' : 'Googleカレンダーに追加'}
          </button>
          {syncError && <p className="text-xs text-red-300 bg-red-500/20 rounded px-2 py-1 mt-1">{syncError}</p>}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-400 mb-2">出欠（ワンタップ）</h2>
          <div className="flex gap-2">
            {(['YES', 'MAYBE', 'NO'] as const).map((a) => (
              <button
                key={a}
                onClick={() => putAttendance(a)}
                disabled={submitting}
                className={`flex-1 py-3 rounded-lg font-medium ${
                  myAtt?.answer === a
                    ? a === 'YES'
                      ? 'bg-green-500 text-white'
                      : a === 'MAYBE'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-500 text-white'
                    : 'bg-navy-800/50 text-slate-400 border border-navy-700'
                }`}
              >
                {a === 'YES' ? '◯ 出る' : a === 'MAYBE' ? '△ 微妙' : '✕ 出ない'}
              </button>
            ))}
          </div>
          {activity.attendanceSummaryByRole && (
            <p className="text-sm text-slate-400 mt-2">
              {['PLAYER', 'MANAGER'].map((role) => {
                const s = activity.attendanceSummaryByRole![role];
                if (!s || (s.YES === 0 && s.MAYBE === 0 && s.NO === 0 && s.noAnswer === 0)) return null;
                return (
                  <span key={role} className="mr-4">
                    {getMemberTypeLabel(role)} ○{s.YES}名 ×{s.NO}名 △{s.MAYBE}名
                    {s.noAnswer > 0 && ` 未回答${s.noAnswer}名`}
                  </span>
                );
              }).filter(Boolean).join(' / ') || `未回答: ${activity.noAnswerCount}名`}
            </p>
          )}
          {!activity.attendanceSummaryByRole && (
            <p className="text-xs text-slate-500 mt-2">未回答: {activity.noAnswerCount}名</p>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-400 mb-2">出欠一覧</h2>
          <div className="divide-y divide-navy-700 border border-navy-700 rounded-r-xl bg-navy-800/80 border-l-4 border-navy-600">
            {activity.attendances.map((a) => (
              <div key={a.id} className="p-3 flex justify-between items-center">
                <span className="text-sm text-white">
                  {a.user.displayName}
                  <span className="text-xs text-slate-500 ml-1">({getMemberTypeLabel(a.user.memberType ?? 'PLAYER')})</span>
                </span>
                <span
                  className={`text-sm font-medium ${
                    a.answer === 'YES' ? 'text-green-400' : a.answer === 'MAYBE' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  {a.answer === 'YES' ? '◯' : a.answer === 'MAYBE' ? '△' : '✕'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
