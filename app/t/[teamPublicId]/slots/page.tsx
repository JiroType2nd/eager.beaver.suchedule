'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDateTimeRange } from '@/lib/date-utils';

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
};

type Data = {
  team: { name: string; publicId: string };
  slots: Slot[];
};

export default function PublicSlotsPage() {
  const params = useParams();
  const publicId = params.teamPublicId as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proposingSlot, setProposingSlot] = useState<string | null>(null);
  const [proposingCustom, setProposingCustom] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/teams/${publicId}/slots`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error?.message ?? 'エラー');
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [publicId]);

  const submitProposal = async (slotId: string | null, startAt: string, endAt: string) => {
    if (!opponentName.trim()) {
      setError('相手チーム名を入力してください');
      return;
    }
    if (!slotId && (!startAt || !endAt)) {
      setError('日時を入力してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/teams/${publicId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slotId || undefined,
          opponentName: opponentName.trim(),
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message ?? '提案の送信に失敗しました');
      setSuccess('提案を送信しました');
      setProposingSlot(null);
      setProposingCustom(false);
      setOpponentName('');
      setCustomStart('');
      setCustomEnd('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) return <main className="min-h-screen p-4"><p className="text-gray-500">読み込み中…</p></main>;
  if (error && !data) return <main className="min-h-screen p-4"><p className="text-red-600">{error}</p></main>;
  if (!data) return <main className="min-h-screen p-4"><p className="text-gray-500">チームが見つかりません</p></main>;

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-2">{data.team.name}</h1>
        <p className="text-sm text-gray-500 mb-6">空き枠一覧（外部向け）</p>

        {success && (
          <p className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{success}</p>
        )}
        {error && (
          <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>
        )}

        {data.slots.length === 0 ? (
          <p className="text-gray-500 py-8">現在、空き枠はありません</p>
        ) : (
          <div className="space-y-4 mb-8">
            {data.slots.map((s) => (
              <div
                key={s.id}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <p className="font-medium">{s.placeName}</p>
                <p className="text-sm text-gray-600 mt-1">{formatDateTimeRange(s.startAt, s.endAt)}</p>
                {proposingSlot === s.id ? (
                  <div className="mt-4 space-y-2">
                    <input
                      type="text"
                      value={opponentName}
                      onChange={(e) => setOpponentName(e.target.value)}
                      placeholder="相手チーム名"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitProposal(s.id, s.startAt, s.endAt)}
                        disabled={submitting}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        送信
                      </button>
                      <button
                        onClick={() => { setProposingSlot(null); setOpponentName(''); setError(''); }}
                        className="px-4 py-2 border rounded-lg text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setProposingSlot(s.id); setProposingCustom(false); setError(''); }}
                    className="mt-3 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
                  >
                    この枠で提案する
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <section className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h2 className="font-medium mb-2">日時を指定して提案する</h2>
          {proposingCustom ? (
            <div className="space-y-2">
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="相手チーム名"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => submitProposal(null, customStart, customEnd)}
                  disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  送信
                </button>
                <button
                  onClick={() => { setProposingCustom(false); setOpponentName(''); setCustomStart(''); setCustomEnd(''); setError(''); }}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setProposingCustom(true); setProposingSlot(null); setError(''); }}
              className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
            >
              日時を入力して提案する
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
