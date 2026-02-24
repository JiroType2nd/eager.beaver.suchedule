'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function EventCancelPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { status } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/events/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'エラー');
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">ログインが必要です</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-lg mx-auto py-6">
        <Link href={`/events/${id}`} className="text-blue-600 text-sm">← イベントに戻る</Link>
        <h1 className="text-xl font-bold mt-4 mb-6">イベントを中止しますか？</h1>
        <p className="text-gray-600 mb-6">
          中止すると、全メンバーのGoogleカレンダーからも削除されます。この操作は取り消せません。
        </p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <div className="flex gap-4">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? '処理中…' : '中止する'}
          </button>
          <Link
            href={`/events/${id}`}
            className="flex-1 py-3 bg-gray-200 text-center rounded-lg font-medium"
          >
            キャンセル
          </Link>
        </div>
      </div>
    </main>
  );
}
