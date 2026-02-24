'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTimeRange } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';

type Availability = {
  id: string;
  userId: string;
  answer: string;
  lateAt: string | null;
  leaveAt: string | null;
  comment: string | null;
  user: { displayName: string; memberType: string };
};

type ProposalDetail = {
  id: string;
  opponentName: string;
  startAt: string;
  endAt: string;
  status: string;
  theirOk: boolean;
  ourOk: boolean;
  slot: { placeName: string; placeUrl: string | null } | null;
  placeName: string | null;
  placeUrl: string | null;
  availabilities: Availability[];
  event: { id: string } | null;
  availabilitySummary: {
    players: { yes: number; maybe: number; no: number; total: number };
    managers: { yes: number; maybe: number; no: number; total: number };
  };
  noAnswerCount: number;
};

type Me = { user: { role: string }; team: { publicId: string } };

export default function ProposalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { status } = useSession();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [myAv, setMyAv] = useState<{ answer: string } | null>(null);
  const [tab, setTab] = useState<'availability' | 'info'>('availability');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    Promise.all([
      apiGet<ProposalDetail>(`/api/proposals/${id}`),
      apiGet<Me>('/api/me'),
      apiGet<{ answer: string } | null>(`/api/proposals/${id}/availability`).catch(() => null),
    ])
      .then(([p, m, av]) => {
        setProposal(p);
        setMe(m);
        setMyAv(av);
      })
      .catch(() => setProposal(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    load();
  }, [status, id]);

  const putAvailability = async (answer: 'YES' | 'MAYBE' | 'NO') => {
    setSubmitting(true);
    try {
      await fetch(`/api/proposals/${id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answer }),
      });
      setMyAv({ answer });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const setOurOk = async (ok: boolean) => {
    setSubmitting(true);
    try {
      await fetch(`/api/proposals/${id}/ok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ side: 'OUR', ok }),
      });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/proposals/${id}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'エラー');
      if (data.eventId) router.push(`/events/${data.eventId}`);
      else load();
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">
          {status === 'loading' ? '読み込み中…' : 'ログインが必要です'}
        </p>
      </main>
    );
  }

  if (loading || !proposal) {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">{loading ? '読み込み中…' : '提案が見つかりません'}</p>
      </main>
    );
  }

  const canConfirm =
    proposal.status === 'READY' &&
    proposal.ourOk &&
    proposal.theirOk &&
    me?.user?.role === 'OWNER' &&
    !proposal.event;

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/" className="text-blue-600 text-sm">← ホーム</Link>
          <h1 className="text-xl font-bold">vs {proposal.opponentName}</h1>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg mb-4">
          <p className="font-medium">{formatDateTimeRange(proposal.startAt, proposal.endAt)}</p>
          <p className="text-sm text-gray-600">
            {proposal.slot?.placeName ?? proposal.placeName ?? '場所未定'}
            {proposal.slot?.placeUrl && (
              <a href={proposal.slot.placeUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 text-xs">地図</a>
            )}
            {!proposal.slot?.placeUrl && proposal.placeUrl && (
              <a href={proposal.placeUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 text-xs">地図</a>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {proposal.status === 'CONFIRMED' && proposal.event && (
              <Link href={`/events/${proposal.event.id}`} className="text-blue-600">
                確定イベントを見る →
              </Link>
            )}
            {proposal.status === 'READY' && '双方OK済・確定待ち'}
            {proposal.status === 'COLLECTING' && '出欠収集中'}
            {proposal.status === 'CANCELLED' && '中止'}
          </p>
        </div>

        {/* 出欠集計サマリ */}
        <div className="flex gap-4 mb-4 text-sm">
          <span>プレイヤー: ◯{proposal.availabilitySummary.players.yes} △{proposal.availabilitySummary.players.maybe} ✕{proposal.availabilitySummary.players.no}</span>
          <span>マネージャー: ◯{proposal.availabilitySummary.managers.yes} △{proposal.availabilitySummary.managers.maybe} ✕{proposal.availabilitySummary.managers.no}</span>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setTab('availability')}
            className={`px-4 py-2 text-sm font-medium ${tab === 'availability' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            出欠
          </button>
          <button
            onClick={() => setTab('info')}
            className={`px-4 py-2 text-sm font-medium ${tab === 'info' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            情報
          </button>
        </div>

        {tab === 'availability' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">自分の出欠（ワンタップ）</p>
            <div className="flex gap-2">
              {(['YES', 'MAYBE', 'NO'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => putAvailability(a)}
                  disabled={submitting}
                  className={`flex-1 py-3 rounded-lg font-medium ${
                    myAv?.answer === a
                      ? a === 'YES'
                        ? 'bg-green-500 text-white'
                        : a === 'MAYBE'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {a === 'YES' ? '◯ 出る' : a === 'MAYBE' ? '△ 微妙' : '✕ 出ない'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">未回答: {proposal.noAnswerCount}名</p>
            <div className="divide-y border border-gray-200 rounded-lg">
              {proposal.availabilities.map((a) => (
                <div key={a.id} className="p-3 flex justify-between items-center">
                  <span className="text-sm">{a.user.displayName}</span>
                  <span className={`text-sm font-medium ${
                    a.answer === 'YES' ? 'text-green-600' : a.answer === 'MAYBE' ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    {a.answer === 'YES' ? '◯' : a.answer === 'MAYBE' ? '△' : '✕'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'info' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">相手チーム</p>
              <p className="font-medium">{proposal.opponentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">自チームOK</p>
              {proposal.status !== 'CONFIRMED' && proposal.status !== 'CANCELLED' && (
                <button
                  onClick={() => setOurOk(!proposal.ourOk)}
                  disabled={submitting}
                  className={`mt-1 px-4 py-2 rounded-lg ${proposal.ourOk ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                >
                  {proposal.ourOk ? 'OK済' : 'OKにする'}
                </button>
              )}
              {proposal.ourOk && <p className="text-green-600 text-sm mt-1">✓ OK</p>}
            </div>
            <div>
              <p className="text-sm text-gray-500">相手チームOK</p>
              <p className={proposal.theirOk ? 'text-green-600' : 'text-gray-500'}>
                {proposal.theirOk ? '✓ OK' : '未'}
              </p>
            </div>
            {canConfirm && (
              <button
                onClick={confirm}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium"
              >
                イベントを確定する
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
