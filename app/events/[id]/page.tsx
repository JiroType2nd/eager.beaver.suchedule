'use client';

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTimeRange } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';

type Availability = {
  answer: string;
  user: { displayName: string; memberType: string };
};

type EventDetail = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
  notes: string | null;
  status: string;
  proposal: {
    id: string;
    opponentName: string;
    availabilities: Availability[];
  };
  createdBy: { displayName: string };
};

type Me = { user: { role: string }; team: { publicId: string } };

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { status } = useSession();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      apiGet<EventDetail>(`/api/events/${id}`),
      apiGet<Me>('/api/me').catch(() => null),
    ])
      .then(([e, m]) => {
        setEvent(e);
        setMe(m);
      })
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [status, id]);

  const handleDelete = async () => {
    if (!confirm('このイベントを削除しますか？削除すると元に戻せません。')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '削除に失敗しました');
      window.location.href = '/';
    } finally {
      setDeleting(false);
    }
  };

  const copyLineMessage = () => {
    if (!event) return;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const lines = [
      '【交流戦確定】',
      event.title,
      formatDateTimeRange(event.startAt, event.endAt),
      event.placeName,
      ...(event.placeUrl ? [event.placeUrl] : []),
      ...(base ? [`${base}/proposals/${event.proposal.id}`] : []),
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

  if (loading || !event) {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">{loading ? '読み込み中…' : 'イベントが見つかりません'}</p>
      </main>
    );
  }

  const isOwner = me?.user?.role === 'OWNER';

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/" className="text-blue-600 text-sm">← ホーム</Link>
          <h1 className="text-xl font-bold">{event.title}</h1>
        </div>

        {event.status === 'CANCELLED' && (
          <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">このイベントは中止されています</p>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">日時</p>
            <p className="font-medium">{formatDateTimeRange(event.startAt, event.endAt)}</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">場所</p>
            <p className="font-medium">{event.placeName}</p>
            {event.placeUrl && (
              <a
                href={event.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm mt-1 block"
              >
                {event.placeUrl}
              </a>
            )}
          </div>
          {event.notes && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">備考</p>
              <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800">LINE用文面</p>
            <button
              onClick={copyLineMessage}
              className="mt-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded text-sm"
            >
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">出欠</p>
            <div className="divide-y">
              {event.proposal.availabilities.map((a) => (
                <div key={a.user.displayName} className="py-2 flex justify-between">
                  <span className="text-sm">{a.user.displayName}</span>
                  <span className={`text-sm ${
                    a.answer === 'YES' ? 'text-green-600' : a.answer === 'MAYBE' ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    {a.answer === 'YES' ? '◯' : a.answer === 'MAYBE' ? '△' : '✕'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/team?eventId=${event.id}`}
            className="block p-4 bg-white border border-gray-200 rounded-lg text-center text-blue-600"
          >
            試合記録を見る →
          </Link>

          {isOwner && event.status === 'CANCELLED' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="block w-full py-3 bg-red-50 text-red-700 text-center rounded-lg font-medium border border-red-200 disabled:opacity-50"
            >
              {deleting ? '削除中…' : '中止済みイベントを削除'}
            </button>
          )}
          {isOwner && event.status === 'CONFIRMED' && (
            <>
              <Link
                href={`/events/${event.id}/edit`}
                className="block py-3 bg-blue-600 text-white text-center rounded-lg font-medium mb-2"
              >
                イベントを編集する
              </Link>
              <Link
                href={`/events/${event.id}/cancel`}
              className="block py-3 bg-red-50 text-red-700 text-center rounded-lg font-medium border border-red-200"
            >
              イベントを中止する
            </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
