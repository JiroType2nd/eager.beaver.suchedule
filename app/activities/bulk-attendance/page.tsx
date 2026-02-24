'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTimeRange, formatActivityTitleWithType } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
};

export default function BulkAttendancePage() {
  const { status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [answers, setAnswers] = useState<Record<string, 'YES' | 'MAYBE' | 'NO'>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<Activity[]>('/api/activities?upcoming=1')
      .then((a) => {
        setActivities(a);
        setAnswers({});
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = Object.entries(answers).map(([activityId, answer]) => ({
      activityId,
      answer,
    }));
    if (items.length === 0) {
      setError('出欠を選択してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/activities/attendance-bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '登録に失敗しました');
      router.push('/activities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー');
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

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href="/activities" className="text-gold-400 hover:text-gold-300 text-sm">← 一覧へ</Link>
        <h1 className="text-xl font-bold text-white mt-4 mb-2">一括で出欠を登録</h1>
        <p className="text-sm text-slate-400 mb-6">
          これからの活動日程に一括で出欠を登録できます。
        </p>

        {loading ? (
          <p className="text-slate-400">読み込み中…</p>
        ) : activities.length === 0 ? (
          <p className="text-slate-400 py-8">これからの活動日程はありません</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-300 bg-red-500/20 text-sm rounded px-2 py-1">{error}</p>}
            <div className="space-y-3">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="p-4 bg-navy-800/80 border border-navy-700/50 rounded-r-xl border-l-4 border-navy-600"
                >
                  <p className="font-medium text-white">{formatActivityTitleWithType(a.title, a.placeName, a.activityType)}</p>
                  <p className="text-sm text-slate-400">{formatDateTimeRange(a.startAt, a.endAt)}</p>
                  <p className="text-sm text-slate-500">{a.placeName}</p>
                  <div className="flex gap-2 mt-3">
                    {(['YES', 'MAYBE', 'NO'] as const).map((ans) => (
                      <button
                        key={ans}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [a.id]: ans }))
                        }
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                          answers[a.id] === ans
                            ? ans === 'YES'
                              ? 'bg-green-500 text-white'
                              : ans === 'MAYBE'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-500 text-white'
                            : 'bg-navy-800/50 text-slate-400 border border-navy-700'
                        }`}
                      >
                        {ans === 'YES' ? '◯ 出る' : ans === 'MAYBE' ? '△ 微妙' : '✕ 出ない'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting || Object.keys(answers).length === 0}
              className="w-full py-3 bg-gold-500 text-navy-900 rounded-lg font-medium hover:bg-gold-400 disabled:opacity-50"
            >
              {submitting ? '登録中…' : '一括で登録する'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
