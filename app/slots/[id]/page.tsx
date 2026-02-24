'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTimeRange } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
  placeReason: string | null;
  notes: string | null;
  status: string;
  createdBy: { displayName: string };
};

type Me = { user: unknown; team: { publicId: string } };

export default function SlotDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { status } = useSession();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      apiGet<Slot>(`/api/slots/${id}`).catch(() => null),
      apiGet<Me>('/api/me').then((m) => m.team.publicId).catch(() => null),
    ])
      .then(([s, pid]) => {
        setSlot(s ?? null);
        setPublicId(pid ?? null);
      })
      .finally(() => setLoading(false));
  }, [status, id]);

  const shareUrl =
    typeof window !== 'undefined' && publicId
      ? `${window.location.origin}/t/${publicId}/slots`
      : '';

  const copyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
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

  if (loading || !slot) {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">{loading ? '読み込み中…' : '枠が見つかりません'}</p>
      </main>
    );
  }


  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/slots" className="text-blue-600 text-sm">← 一覧へ</Link>
          <h1 className="text-xl font-bold">枠詳細</h1>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">場所</p>
            <p className="font-medium">{slot.placeName}</p>
            {slot.placeUrl && (
              <a
                href={slot.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm mt-1 block"
              >
                {slot.placeUrl}
              </a>
            )}
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">日時</p>
            <p className="font-medium">{formatDateTimeRange(slot.startAt, slot.endAt)}</p>
          </div>

          {slot.placeReason && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">体育館の理由メモ</p>
              <p className="text-sm whitespace-pre-wrap">{slot.placeReason}</p>
            </div>
          )}

          {slot.notes && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">備考</p>
              <p className="text-sm whitespace-pre-wrap">{slot.notes}</p>
            </div>
          )}

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">状態</p>
            <p className="font-medium">
              {slot.status === 'OPEN' && '未決定'}
              {slot.status === 'BOOKED' && '予約済'}
              {slot.status === 'CANCELLED' && '中止'}
            </p>
            <p className="text-xs text-gray-400 mt-1">作成: {slot.createdBy.displayName}</p>
          </div>

          {slot.status === 'OPEN' && (
            <div className="space-y-2">
              <Link
                href={`/proposals/new?slotId=${slot.id}`}
                className="block w-full py-2 text-center bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
              >
                この枠で提案する
              </Link>
              {publicId && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800">外部共有URL</p>
              <p className="text-xs text-amber-700 mt-1 break-all">{shareUrl}</p>
              <button
                onClick={copyShareUrl}
                className="mt-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded text-sm"
              >
                {copied ? 'コピーしました' : 'URLをコピー'}
              </button>
            </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
