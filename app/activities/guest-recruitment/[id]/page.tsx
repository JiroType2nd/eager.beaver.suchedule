'use client';

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ActivitiesNav } from '@/components/ActivitiesNav';
import { useEffect, useState } from 'react';
import { formatDateTimeRange } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';

type Application = {
  id: string;
  user: { id: string; displayName: string };
};

type GuestRecruitmentDetail = {
  id: string;
  title: string | null;
  placeName: string;
  placeUrl: string | null;
  level: string;
  capacity: number;
  feeYen: number;
  startAt: string;
  endAt: string;
  notes: string | null;
  createdBy: { displayName: string };
  applications: Application[];
  applicationCount: number;
  isFull: boolean;
  myApplication: { id: string; userId: string } | null;
};

export default function GuestRecruitmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { status } = useSession();
  const [recruitment, setRecruitment] = useState<GuestRecruitmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [me, setMe] = useState<{ user: { address: string | null; postalCode: string | null } } | null>(null);

  const load = () => {
    Promise.all([
      apiGet<GuestRecruitmentDetail>(`/api/guest-recruitments/${id}`),
      apiGet<{ user: { address: string | null; postalCode: string | null } }>('/api/me').catch(() => ({ user: { address: null, postalCode: null } })),
    ])
      .then(([r, m]) => {
        setRecruitment(r);
        setMe(m);
        setError(null);
      })
      .catch(() => setRecruitment(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    load();
  }, [status, id]);

  const handleApply = async () => {
    if (!recruitment || recruitment.isFull || recruitment.myApplication) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/guest-recruitments/${id}/apply`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '申し込みに失敗しました');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '申し込みに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelApply = async () => {
    if (!recruitment?.myApplication) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/guest-recruitments/${id}/apply`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'キャンセルに失敗しました');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'キャンセルに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/guest-recruitments/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '削除に失敗しました');
      window.location.href = '/activities';
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const openAccessDirections = () => {
    if (!recruitment) return;
    const origin = (me?.user?.address?.trim() || me?.user?.postalCode?.trim())
      ? encodeURIComponent([me?.user?.postalCode, me?.user?.address].filter(Boolean).join(' ').trim())
      : null;
    const dest = encodeURIComponent(recruitment.placeName);
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=transit`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`;
    window.open(url, '_blank');
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">{status === 'loading' ? '読み込み中…' : 'ログインが必要です'}</p>
      </main>
    );
  }

  if (loading || !recruitment) {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">{loading ? '読み込み中…' : '募集が見つかりません'}</p>
      </main>
    );
  }

  const feeDisplay = recruitment.feeYen === 0 ? '無料' : `${recruitment.feeYen}円`;

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <Link href="/activities" className="text-gold-400 hover:text-gold-300 text-sm">← 一覧へ</Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={`text-sm ${deleteConfirm ? 'text-red-300 font-medium' : 'text-slate-500'}`}
          >
            {deleting ? '削除中…' : deleteConfirm ? '本当に削除する' : '削除'}
          </button>
        </div>
        <ActivitiesNav />

        <span className="inline-block mt-4 px-2 py-0.5 text-xs font-medium bg-violet-500/30 text-violet-300 rounded">
          外部募集
        </span>
        <h1 className="text-xl font-bold text-white mt-2 mb-2">
          {recruitment.title || recruitment.placeName}
        </h1>
        <p className="text-sm text-slate-400">{formatDateTimeRange(recruitment.startAt, recruitment.endAt)}</p>
        <p className="text-sm text-slate-500">{recruitment.placeName}</p>
        {recruitment.placeUrl && (
          <a href={recruitment.placeUrl} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:text-gold-300 text-sm block mt-1">
            {recruitment.placeUrl}
          </a>
        )}
        <p className="text-sm text-slate-400 mt-1">
          レベル: {recruitment.level}　定員: {recruitment.applicationCount}/{recruitment.capacity}　参加費: {feeDisplay}
        </p>
        <button
          type="button"
          onClick={openAccessDirections}
          className="mt-2 w-full py-2 px-4 border border-green-500/70 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/20"
        >
          アクセス確認（経路を表示）
        </button>
        {recruitment.notes && (
          <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">{recruitment.notes}</p>
        )}
        <p className="text-xs text-slate-400 mt-2">作成: {recruitment.createdBy.displayName}</p>

        {error && <p className="text-red-300 bg-red-500/20 text-sm mt-2 rounded px-2 py-1">{error}</p>}

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-400 mb-2">参加申し込み</h2>
          {recruitment.myApplication ? (
            <button
              type="button"
              onClick={handleCancelApply}
              disabled={submitting}
              className="w-full py-3 border border-gold-500/70 text-gold-400 rounded-lg font-medium hover:bg-gold-500/20 disabled:opacity-50"
            >
              {submitting ? '処理中…' : '申し込みをキャンセル'}
            </button>
          ) : recruitment.isFull ? (
            <p className="py-3 text-center text-slate-500 font-medium">定員に達しました</p>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={submitting}
              className="w-full py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? '処理中…' : '申し込む'}
            </button>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-400 mb-2">申込者一覧（{recruitment.applicationCount}名）</h2>
          <div className="divide-y divide-navy-700 border border-navy-700 rounded-r-xl bg-navy-800/80 border-l-4 border-navy-600">
            {recruitment.applications.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">まだ申込はありません</div>
            ) : (
              recruitment.applications.map((a) => (
                <div key={a.id} className="p-3 text-sm text-white">
                  {a.user.displayName}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
