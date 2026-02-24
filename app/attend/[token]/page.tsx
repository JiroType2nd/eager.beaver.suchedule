'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDateTimeRange } from '@/lib/date-utils';

type Activity = {
  id: string;
  title: string | null;
  placeName: string;
  startAt: string;
  endAt: string;
};

type Submission = {
  id: string;
  nickname: string;
  items: { activityScheduleId: string; answer: string }[];
};

type Aggregate = {
  activityScheduleId: string;
  yesCount: number;
  maybeCount: number;
  noCount: number;
};

type Data = {
  teamName: string;
  activities: Activity[];
  submissions: Submission[];
  aggregates: Aggregate[];
};

const ANSWER_LABELS: Record<string, string> = {
  YES: '〇',
  MAYBE: '△',
  NO: '×',
};

export default function AttendPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'view' | 'form' | 'edit'>('view');
  const [nickname, setNickname] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/attend/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error?.message ?? 'エラー');
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  const openForm = () => {
    setMode('form');
    setNickname('');
    setAnswers({});
    setEditingSubmissionId(null);
    setError('');
    setSuccess('');
  };

  const openEdit = (sub: Submission) => {
    setMode('edit');
    setNickname(sub.nickname);
    const ans: Record<string, string> = {};
    for (const item of sub.items) ans[item.activityScheduleId] = item.answer;
    setAnswers(ans);
    setEditingSubmissionId(sub.id);
    setError('');
    setSuccess('');
  };

  const setAnswer = (activityId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [activityId]: answer }));
  };

  const handleSubmit = async () => {
    if (!data) return;
    const nick = nickname.trim();
    if (!nick) {
      setError('ニックネームを入力してください');
      return;
    }
    const items = data.activities
      .filter((a) => answers[a.id])
      .map((a) => ({ activityScheduleId: a.id, answer: answers[a.id] as 'YES' | 'MAYBE' | 'NO' }));
    if (items.length !== data.activities.length) {
      setError('各日程に出欠を選択してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'edit' && editingSubmissionId) {
        const res = await fetch(`/api/attend/${token}/submissions/${editingSubmissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: nick, items }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.error?.message ?? '更新に失敗しました');
        setSuccess('更新しました');
      } else {
        const res = await fetch(`/api/attend/${token}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: nick, items }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.error?.message ?? '登録に失敗しました');
        setSuccess('登録しました');
      }
      load();
      setMode('view');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラー');
    } finally {
      setSubmitting(false);
    }
  };

  const getAggregate = (activityId: string) => {
    const a = data?.aggregates.find((x) => x.activityScheduleId === activityId);
    return a ? { yes: a.yesCount, maybe: a.maybeCount, no: a.noCount } : { yes: 0, maybe: 0, no: 0 };
  };

  if (loading) return <main className="min-h-screen p-4"><p className="text-gray-500">読み込み中…</p></main>;
  if (error && !data) return <main className="min-h-screen p-4"><p className="text-red-600">{error}</p></main>;
  if (!data) return <main className="min-h-screen p-4"><p className="text-gray-500">リンクが見つかりません</p></main>;

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-1">出欠確認</h1>
        <p className="text-sm text-gray-500 mb-4">{data.teamName}</p>

        {success && <p className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{success}</p>}
        {error && <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}

        {mode === 'view' ? (
          <>
            <div className="mb-6">
              <button
                onClick={openForm}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium"
              >
                出欠を登録する
              </button>
            </div>

            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">各日程の集計</h2>
              <div className="space-y-3 mb-6">
                {data.activities.map((act) => {
                  const agg = getAggregate(act.id);
                  return (
                    <div key={act.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                      <p className="font-medium">{act.title || act.placeName}</p>
                      <p className="text-sm text-gray-600">{formatDateTimeRange(act.startAt, act.endAt)}</p>
                      <p className="text-sm text-gray-500">{act.placeName}</p>
                      <p className="text-sm text-blue-600 mt-2">
                        〇 {agg.yes}人　△ {agg.maybe}人　× {agg.no}人
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">出欠一覧</h2>
              {data.submissions.length === 0 ? (
                <p className="text-gray-500 py-4">まだ登録はありません</p>
              ) : (
                <div className="space-y-2">
                  {data.submissions.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => openEdit(sub)}
                      className="w-full p-4 text-left bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <p className="font-medium">{sub.nickname}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {data.activities.map((act) => {
                          const item = sub.items.find((i) => i.activityScheduleId === act.id);
                          return (
                            <span key={act.id} className="mr-3">
                              {formatDateTimeRange(act.startAt, act.endAt)}: {item ? ANSWER_LABELS[item.answer] ?? item.answer : '-'}
                            </span>
                          );
                        })}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">タップして編集</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム *</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="例: たろう"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">各日程の出欠 *</label>
              <div className="space-y-3">
                {data.activities.map((act) => (
                  <div key={act.id} className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium text-sm">{act.title || act.placeName}</p>
                    <p className="text-xs text-gray-500">{formatDateTimeRange(act.startAt, act.endAt)} {act.placeName}</p>
                    <div className="flex gap-2 mt-2">
                      {(['YES', 'MAYBE', 'NO'] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAnswer(act.id, a)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                            answers[act.id] === a
                              ? a === 'YES'
                                ? 'bg-green-500 text-white'
                                : a === 'MAYBE'
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-500 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {ANSWER_LABELS[a]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode('view'); setError(''); }}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {submitting ? '送信中…' : mode === 'edit' ? '更新' : '登録'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
