'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { formatDateTimeRange } from '@/lib/date-utils';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
  createdBy: { displayName: string };
};

type Proposal = {
  id: string;
  opponentName: string;
  startAt: string;
  endAt: string;
  status: string;
  activityScheduleId: string | null;
  slot: { placeName: string } | null;
  placeName: string | null;
  activity: { id: string; activityType: string | null } | null;
};

type MeResponse = {
  user: { role: string };
  team: { publicId: string };
};

export default function SlotsPage() {
  const { status } = useSession();
  const [candidates, setCandidates] = useState<Activity[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      apiGet<Activity[]>('/api/activities?upcoming=1&activityType=未定').catch(() => []),
      apiGet<Proposal[]>('/api/proposals').then((p) =>
        Array.isArray(p) ? p.filter((x) => x.status === 'COLLECTING' || x.status === 'READY') : []
      ).catch(() => []),
      apiGet<MeResponse>('/api/me'),
    ])
      .then(([a, p, me]) => {
        setCandidates(a);
        setProposals(p);
        setIsAdmin(me?.user?.role === 'OWNER' || me?.user?.role === 'STAFF');
        if (typeof window !== 'undefined' && me?.team?.publicId) {
          setInviteUrl(`${window.location.origin}/t/${me.team.publicId}/exchange`);
        }
      })
      .finally(() => setLoading(false));
  }, [status]);

  const handleConfirm = async (proposalId: string) => {
    setConfirmingId(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/confirm-activity`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '確定に失敗しました');
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId && p.activity
            ? { ...p, activity: { ...p.activity, activityType: '交流戦（確定）' } }
            : p
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラー');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCopyUrl = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
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
        <h1 className="text-xl font-bold text-white mb-2">交流戦日程</h1>

        <section className="mb-6 p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl">
          <h2 className="font-medium text-gold-400 mb-2">相手チームに日程調整を送る</h2>
          <p className="text-sm text-slate-300 mb-2">
            このURLを相手チームに送ると、相手が日程を調整できます。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-white"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-medium hover:bg-gold-400"
            >
              {copySuccess ? 'コピーしました' : 'コピー'}
            </button>
          </div>
        </section>

        {loading ? (
          <p className="text-slate-400">読み込み中…</p>
        ) : (
          <>
            {candidates.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase mb-2">
                  交流戦候補日程（活動内容が未定）
                </h2>
                <p className="text-sm text-slate-400 mb-2">
                  相手チームに共有したページ（/t/.../exchange）で、相手が候補日程から出欠リンクを作成できます。
                </p>
                <div className="space-y-2">
                  {candidates.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 bg-navy-800/80 border-l-4 border-navy-600 rounded-r-xl border border-navy-700/50"
                    >
                      <p className="font-medium text-white">{a.title || a.placeName}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {formatDateTimeRange(a.startAt, a.endAt)}
                      </p>
                      <p className="text-sm text-slate-500">{a.placeName}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {proposals.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase mb-2">
                  募集中の提案
                </h2>
                <div className="space-y-2">
                  {proposals.map((p) => {
                    const isConfirmed = p.activity?.activityType === '交流戦（確定）';
                    return (
                      <div
                        key={p.id}
                        className="p-4 bg-navy-800/80 border-l-4 border-amber-500 rounded-r-xl border border-navy-700/50"
                      >
                        <Link href={`/proposals/${p.id}`} className="block">
                          <p className="font-medium text-white">vs {p.opponentName}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {formatDateTimeRange(p.startAt, p.endAt)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {p.slot?.placeName ?? p.placeName ?? '場所未定'}
                            {isConfirmed && <span className="ml-2 text-emerald-400">（確定）</span>}
                          </p>
                        </Link>
                        {isAdmin && p.activityScheduleId && !isConfirmed && (
                          <button
                            type="button"
                            onClick={() => handleConfirm(p.id)}
                            disabled={confirmingId === p.id}
                            className="mt-2 px-3 py-1 bg-emerald-600 text-white rounded text-sm disabled:opacity-50 hover:bg-emerald-500"
                          >
                            {confirmingId === p.id ? '確定中…' : '確定'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {candidates.length === 0 && proposals.length === 0 && (
              <p className="text-slate-500 py-8">
                活動内容が「未定」の日程を活動日程に登録すると、ここに候補として表示されます。
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
