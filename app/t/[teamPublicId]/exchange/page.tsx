'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDateTimeRange } from '@/lib/date-utils';
import { VENUE_OPTIONS, VENUE_OTHER } from '@/lib/venue-options';
import { TIME_OPTIONS } from '@/lib/time-options';

type Candidate = {
  id: string;
  title: string | null;
  placeName: string;
  placeUrl: string | null;
  startAt: string;
  endAt: string;
};

type Data = {
  team: { name: string; publicId: string };
  candidates: Candidate[];
};

export default function ExchangePage() {
  const params = useParams();
  const publicId = params.teamPublicId as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'main' | 'custom'>('main');
  const [opponentName, setOpponentName] = useState('');
  const [dates, setDates] = useState<{ date: string; startTime: string; endTime: string; placeSelect: string; placeOtherName: string; placeUrl: string }[]>([
    { date: '', startTime: '09:00', endTime: '11:00', placeSelect: '', placeOtherName: '', placeUrl: '' },
  ]);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [linkCreating, setLinkCreating] = useState(false);
  const [attendanceLinkUrl, setAttendanceLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/teams/${publicId}/exchange`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error?.message ?? 'エラー');
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [publicId]);

  const handleCreateAttendanceLink = async () => {
    if (selectedIds.size === 0) {
      setError('出欠リンクに含める日程を1件以上選択してください');
      return;
    }
    setError('');
    setLinkCreating(true);
    setAttendanceLinkUrl(null);
    try {
      const res = await fetch(`/api/public/teams/${publicId}/attendance-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityIds: Array.from(selectedIds) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message ?? 'リンクの作成に失敗しました');
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      setAttendanceLinkUrl(`${base}/attend/${result.token}`);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'リンクの作成に失敗しました');
    } finally {
      setLinkCreating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedIds.size === data.candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.candidates.map((c) => c.id)));
    }
  };

  const addDate = () => setDates([...dates, { date: '', startTime: '09:00', endTime: '11:00', placeSelect: '', placeOtherName: '', placeUrl: '' }]);
  const removeDate = (i: number) => setDates(dates.filter((_, idx) => idx !== i));
  const updateDate = (i: number, f: 'date' | 'startTime' | 'endTime' | 'placeSelect' | 'placeOtherName' | 'placeUrl', v: string) => {
    const next = [...dates];
    next[i] = { ...next[i], [f]: v };
    if (f === 'placeSelect' && v !== VENUE_OTHER) {
      const opt = VENUE_OPTIONS.find((o) => o.name === v);
      if (opt) next[i].placeUrl = opt.url ?? '';
    }
    setDates(next);
  };

  const getPlaceNameAndUrl = (d: (typeof dates)[0]) => {
    if (d.placeSelect === VENUE_OTHER) {
      return { placeName: d.placeOtherName.trim(), placeUrl: d.placeUrl.trim() || null };
    }
    const opt = VENUE_OPTIONS.find((o) => o.name === d.placeSelect);
    return {
      placeName: d.placeSelect,
      placeUrl: opt?.url ?? null,
    };
  };

  const submitFromCandidate = async (activityId: string) => {
    if (!opponentName.trim()) {
      setError('チーム名を入力してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const activity = data?.candidates.find((c) => c.id === activityId);
      if (!activity) throw new Error('日程が見つかりません');
      const res = await fetch(`/api/public/teams/${publicId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityScheduleId: activityId,
          opponentName: opponentName.trim(),
          startAt: activity.startAt,
          endAt: activity.endAt,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message ?? '送信に失敗しました');
      setSuccess('提案を送信しました');
      setProposingId(null);
      setOpponentName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラー');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCustomDates = async () => {
    if (!opponentName.trim()) {
      setError('チーム名を入力してください');
      return;
    }
    const validDates = dates.filter((d) => d.date && d.startTime && d.endTime && d.placeSelect);
    if (validDates.length === 0) {
      setError('少なくとも1つの日程と実施場所を入力してください');
      return;
    }
    const invalidPlace = validDates.find((d) => {
      if (d.placeSelect === VENUE_OTHER) return !d.placeOtherName.trim();
      return false;
    });
    if (invalidPlace) {
      setError('「その他」を選択した場合は実施場所名を入力してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/teams/${publicId}/exchange/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentName: opponentName.trim(),
          dates: validDates.map((d) => {
            const { placeName, placeUrl } = getPlaceNameAndUrl(d);
            const startAt = new Date(`${d.date}T${d.startTime}:00`);
            const endAt = new Date(`${d.date}T${d.endTime}:00`);
            return {
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
              placeName,
              placeUrl,
            };
          }),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message ?? '送信に失敗しました');
      setSuccess(`${validDates.length}件の提案を送信しました`);
      setMode('main');
      setOpponentName('');
      setDates([{ date: '', startTime: '09:00', endTime: '11:00', placeSelect: '', placeOtherName: '', placeUrl: '' }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラー');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="min-h-screen p-4"><p className="text-gray-500">読み込み中…</p></main>;
  if (error && !data) return <main className="min-h-screen p-4"><p className="text-red-600">{error}</p></main>;
  if (!data) return <main className="min-h-screen p-4"><p className="text-gray-500">チームが見つかりません</p></main>;

  if (mode === 'custom') {
    return (
      <main className="min-h-screen pb-24">
        <div className="max-w-lg mx-auto px-4 py-6">
          <button onClick={() => setMode('main')} className="text-blue-600 text-sm mb-4">← 戻る</button>
          <h1 className="text-xl font-bold mb-2">交流戦日程の調整</h1>

          <section className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h2 className="font-medium text-amber-800 mb-2">貴チームが確保できている日程から調整を行う場合の流れ</h2>
            <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1">
              <li>日程・実施場所を入力していただく</li>
              <li>弊チームの出欠を確認しご連絡いたします（LINE等）</li>
              <li>双方問題なければ日程確定</li>
            </ol>
          </section>

          {success && <p className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{success}</p>}
          {error && <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); submitCustomDates(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">チーム名 *</label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
                placeholder="例: ○○バスケットボールクラブ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日程（複数可）* 各日程ごとに日付・時間・実施場所を選択してください</label>
              {dates.map((d, i) => (
                <div key={i} className="mb-4 p-4 border border-gray-200 rounded-lg space-y-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs text-gray-600 mb-0.5">日付 *</label>
                      <input
                        type="date"
                        value={d.date}
                        onChange={(e) => updateDate(i, 'date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">開始 *</label>
                      <select
                        value={d.startTime}
                        onChange={(e) => updateDate(i, 'startTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-500 self-end pb-2">～</span>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">終了 *</label>
                      <select
                        value={d.endTime}
                        onChange={(e) => updateDate(i, 'endTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {dates.length > 1 && (
                      <button type="button" onClick={() => removeDate(i)} className="text-red-600 text-sm px-2 self-end pb-2">
                        削除
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">実施場所 *</label>
                    <select
                      value={d.placeSelect}
                      onChange={(e) => updateDate(i, 'placeSelect', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    >
                      <option value="">選択してください</option>
                      {VENUE_OPTIONS.map((v) => (
                        <option key={v.name} value={v.name}>{v.name}</option>
                      ))}
                      <option value={VENUE_OTHER}>{VENUE_OTHER}</option>
                    </select>
                  </div>
                  {d.placeSelect === VENUE_OTHER && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">実施場所名 *</label>
                        <input
                          type="text"
                          value={d.placeOtherName}
                          onChange={(e) => updateDate(i, 'placeOtherName', e.target.value)}
                          placeholder="例: ○○市民体育館"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">実施場所URL</label>
                        <input
                          type="url"
                          value={d.placeUrl}
                          onChange={(e) => updateDate(i, 'placeUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={addDate} className="text-sm text-blue-600 mt-1">
                + 日程を追加
              </button>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? '送信中…' : 'この日程で提案する'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-2">{data.team.name}</h1>
        <p className="text-sm text-gray-500 mb-4">交流戦の日程調整</p>

        <section className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h2 className="font-medium text-amber-800 mb-2">貴チームが確保できている日程から調整を行う場合</h2>
          <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1 mb-3">
            <li>日程・実施場所を入力していただく</li>
            <li>弊チームの出欠を確認しご連絡いたします（LINE等）</li>
            <li>双方問題なければ日程確定</li>
          </ol>
          <button
            onClick={() => setMode('custom')}
            className="w-full py-2 px-4 bg-amber-500 text-white rounded-lg text-sm font-medium"
          >
            日程・実施場所を入力する
          </button>
        </section>

        <section className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-medium text-blue-800 mb-2">弊チームが確保できている体育館で日程調整を行う場合</h2>
          <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
            <li>以下の候補日程から、あなたのチームのメンバーが集まれる日程を確認する</li>
            <li>貴チームの都合の良い日程で「この日程で提案する」を押してください。（※できるだけ複数日程提案いただけると助かります。）</li>
            <li>申し込みいただいた日程で我々チームの参加可能人数を確認でき次第、確定とさせていただきます。</li>
          </ol>
        </section>

        <p className="text-xs text-amber-700 mb-4">
          ※ 先着順のため、途中で候補日程が他チームとの交流戦が決まってしまった場合は、候補日程が先着順となります。また、大会と日程が被ってしまった場合、急遽交流戦確定後でもキャンセルになる場合がございます。
        </p>

        {success && <p className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{success}</p>}
        {error && <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">候補日程</h2>
            {data.candidates.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-sm text-blue-600"
              >
                {selectedIds.size === data.candidates.length ? 'すべて解除' : 'すべて選択'}
              </button>
            )}
          </div>
          {data.candidates.length === 0 ? (
            <p className="text-gray-500 py-6">現在、候補日程はありません</p>
          ) : (
            <>
              <div className="space-y-3">
                {data.candidates.map((c) => (
                  <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{c.title || c.placeName}</p>
                        <p className="text-sm text-gray-600 mt-1">{formatDateTimeRange(c.startAt, c.endAt)}</p>
                        <p className="text-sm text-gray-500">{c.placeName}</p>
                      </div>
                    </label>
                    {proposingId === c.id ? (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={opponentName}
                        onChange={(e) => setOpponentName(e.target.value)}
                        placeholder="チーム名"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitFromCandidate(c.id)}
                          disabled={submitting}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                          送信
                        </button>
                        <button
                          onClick={() => { setProposingId(null); setOpponentName(''); setError(''); }}
                          className="px-4 py-2 border rounded-lg text-sm"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setProposingId(c.id); setError(''); }}
                      className="mt-3 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
                    >
                      この日程で提案する
                    </button>
                  )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-1">出欠リンクを作成</h3>
                <p className="text-sm text-amber-700 mb-3">
                  選択した日程で、貴チームのメンバーが出欠を登録できるリンクを作成できます。
                </p>
                <p className="text-sm font-bold text-amber-900 mb-2 bg-amber-100 -mx-2 -my-1 px-3 py-2 rounded border border-amber-300">
                  ※ 発行したリンクは必ず保存してください。同じリンクを再度表示できません。
                </p>
                <p className="text-xs text-amber-600 mb-2">
                  1件以上チェックを入れてからボタンを押してください。
                </p>
                <button
                  type="button"
                  onClick={handleCreateAttendanceLink}
                  disabled={linkCreating}
                  className="w-full py-2 px-4 border border-amber-600 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
                >
                  {linkCreating ? '作成中…' : '選択した日程で出欠リンクを作成'}
                </button>
                {attendanceLinkUrl && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-bold text-amber-900 bg-amber-100 px-3 py-2 rounded border border-amber-300">
                      必ずリンクを保存してください（コピーまたはブックマーク）
                    </p>
                    <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <input
                      type="text"
                      readOnly
                      value={attendanceLinkUrl}
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(attendanceLinkUrl);
                        setSuccess('URLをコピーしました');
                        setTimeout(() => setSuccess(''), 2000);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium"
                    >
                      コピー
                    </button>
                  </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
