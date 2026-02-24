'use client';

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { apiGet } from '@/lib/api-client';

type Asset = { id: string; type: string; url: string };
type VideoLink = { id: string; youtubeUrl: string };
type MatchRecord = {
  id: string;
  opponentName: string;
  scoreUs: number | null;
  scoreThem: number | null;
  memo: string | null;
  event: { id: string; title: string; startAt: string };
  createdBy: { displayName: string };
  assets: Asset[];
  videoLinks: VideoLink[];
};

export default function MatchDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { status } = useSession();
  const [record, setRecord] = useState<MatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetType, setAssetType] = useState<'IMAGE' | 'PDF'>('IMAGE');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    apiGet<MatchRecord>(`/api/matches/${id}`)
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    load();
  }, [status, id]);

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/matches/${id}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ youtubeUrl: videoUrl.trim() }),
      });
      setVideoUrl('');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const addAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetUrl.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/matches/${id}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: assetType, url: assetUrl.trim() }),
      });
      setAssetUrl('');
      load();
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

  if (loading || !record) {
    return (
      <main className="min-h-screen p-4">
        <p className="text-gray-500">{loading ? '読み込み中…' : '試合記録が見つかりません'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link href={`/team?eventId=${record.event.id}`} className="text-blue-600 text-sm">
          ← 試合記録一覧
        </Link>
        <h1 className="text-xl font-bold mt-4 mb-2">vs {record.opponentName}</h1>
        <p className="text-sm text-gray-600">{record.event.title}</p>
        <p className="text-xs text-gray-500">
          {format(new Date(record.event.startAt), 'M/d(E)', { locale: ja })} · {record.createdBy.displayName}
        </p>

        <div className="mt-6 space-y-4">
          {(record.scoreUs != null || record.scoreThem != null) && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">スコア</p>
              <p className="text-2xl font-bold">
                {record.scoreUs ?? '-'} - {record.scoreThem ?? '-'}
              </p>
            </div>
          )}
          {record.memo && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">メモ</p>
              <p className="text-sm whitespace-pre-wrap">{record.memo}</p>
            </div>
          )}

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">画像・PDF</p>
            {record.assets.length === 0 ? (
              <p className="text-sm text-gray-500">なし</p>
            ) : (
              <div className="space-y-2">
                {record.assets.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 text-sm truncate"
                  >
                    {a.type}: {a.url}
                  </a>
                ))}
              </div>
            )}
            <form onSubmit={addAsset} className="mt-3 flex gap-2">
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as 'IMAGE' | 'PDF')}
                className="px-2 py-1.5 border rounded text-sm"
              >
                <option value="IMAGE">画像</option>
                <option value="PDF">PDF</option>
              </select>
              <input
                type="url"
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                placeholder="URL"
                className="flex-1 px-2 py-1.5 border rounded text-sm"
              />
              <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-gray-200 rounded text-sm">
                追加
              </button>
            </form>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">YouTube動画</p>
            {record.videoLinks.length === 0 ? (
              <p className="text-sm text-gray-500">なし</p>
            ) : (
              <div className="space-y-2">
                {record.videoLinks.map((v) => (
                  <a
                    key={v.id}
                    href={v.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 text-sm truncate"
                  >
                    {v.youtubeUrl}
                  </a>
                ))}
              </div>
            )}
            <form onSubmit={addVideo} className="mt-3 flex gap-2">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/..."
                className="flex-1 px-2 py-1.5 border rounded text-sm"
              />
              <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-gray-200 rounded text-sm">
                追加
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
