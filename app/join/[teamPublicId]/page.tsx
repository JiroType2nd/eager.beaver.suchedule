'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type TeamInfo = {
  teamName: string;
  logoUrl?: string;
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
        setTeam({
          teamName: d.name,
          logoUrl: d.logoUrl,
          publicId: d.publicId,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamPublicId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-navy-900 font-brand">
        <p className="text-slate-400">読み込み中…</p>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-900 font-brand">
        <p className="text-red-400 mb-4">{error ?? 'チームが見つかりません'}</p>
        <Link href="/" className="text-gold-400 hover:text-gold-300 underline">
          トップへ戻る
        </Link>
      </main>
    );
  }

  const signInUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(
    `/join/${team.publicId}/complete`
  )}`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy-900 font-brand">
      <div className="max-w-md w-full bg-navy-800/80 border border-navy-700 rounded-xl shadow-xl p-8 text-center">
        <h1 className="text-slate-400 text-sm font-medium uppercase tracking-wide mb-4">チームに参加</h1>
        <p className="text-white text-lg mb-4">
          <span className="font-bold text-white">{team.teamName}</span>
          に参加しますか？
        </p>
        {team.logoUrl && (
          <div className="flex justify-center mb-4">
            <img
              src={team.logoUrl}
              alt=""
              className="h-16 w-16 object-contain rounded-lg border border-navy-600 bg-navy-900/50"
            />
          </div>
        )}
        <p className="text-sm text-slate-400 mb-6">
          Googleアカウントでログインすると、自動でこのチームのメンバーとして登録されます。
        </p>
        <a
          href={signInUrl}
          className="block w-full py-4 px-4 bg-gold-500 text-navy-900 rounded-xl font-medium text-center no-underline hover:bg-gold-400 transition"
        >
          Googleでログインして参加する
        </a>
        <Link
          href="/"
          className="block mt-4 text-sm text-slate-400 hover:text-gold-400 no-underline transition"
        >
          キャンセル
        </Link>
      </div>
    </main>
  );
}
