'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type TeamInfo = {
  teamName: string;
  publicId: string;
};

export default function JoinTeamPage() {
  const params = useParams();
  const teamPublicId = params.teamPublicId as string;
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/teams/${teamPublicId}/info`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error?.message ?? 'チームが見つかりません');
        setTeam({ teamName: d.name, publicId: d.publicId });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamPublicId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-500">読み込み中…</p>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-600 mb-4">{error ?? 'チームが見つかりません'}</p>
        <Link href="/" className="text-blue-600 underline">
          トップへ戻る
        </Link>
      </main>
    );
  }

  const signInUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(
    `/join/${team.publicId}/complete`
  )}`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-xl font-bold mb-2">チームに参加</h1>
        <p className="text-gray-600 mb-6">
          <span className="font-medium text-gray-800">{team.teamName}</span>
          <br />
          に参加しますか？
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Googleアカウントでログインすると、自動でこのチームのメンバーとして登録されます。
        </p>
        <a
          href={signInUrl}
          className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium text-center no-underline hover:bg-blue-700"
        >
          Googleでログインして参加する
        </a>
        <Link href="/" className="block mt-4 text-sm text-gray-500 underline">
          キャンセル
        </Link>
      </div>
    </main>
  );
}
