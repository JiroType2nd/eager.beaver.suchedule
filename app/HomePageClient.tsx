'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  Swords,
  LogOut,
  User,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { formatDateTimeRange, formatActivityTitleWithType, formatDateShort } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';
import { APP_PURPOSE } from '@/lib/branding';

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
};

type MatrixData = {
  activities: Activity[];
  attendanceMap: Record<string, Record<string, string>>;
  currentUserId: string | null;
};

export function HomePageClient() {
  const { data: session, status } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSessionTimeout(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoading(false);
      return;
    }
    Promise.all([
      apiGet<Activity[]>('/api/activities?upcoming=1').catch(() => []),
      apiGet<MatrixData>('/api/activities?view=matrix&upcoming=1').catch(() => null),
      apiGet<{ user: { fullName: string | null } }>('/api/me').catch(() => ({ user: { fullName: null } })),
    ])
      .then(([a, matrix, me]) => {
        setActivities(a);
        setMatrixData(matrix);
        setNeedsProfileSetup(!me?.user?.fullName?.trim());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  const tournamentSummaries = (() => {
    const tournamentActivities = activities
      .filter((a) => a.activityType === '大会')
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const byName = new Map<string, Activity[]>();
    for (const a of tournamentActivities) {
      const name = (a.title || a.placeName || '大会').trim();
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name)!.push(a);
    }
    return Array.from(byName.entries()).map(([name, items]) => ({
      name,
      items: items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      firstId: items[0]!.id,
      placeName: items[0]!.placeName,
    }));
  })();

  const unconfirmedActivities =
    matrixData?.activities.filter((a) => {
      const myAnswer = matrixData.currentUserId
        ? matrixData.attendanceMap[a.id]?.[matrixData.currentUserId]
        : undefined;
      return !myAnswer || myAnswer === 'MAYBE';
    }) ?? [];

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <Home className="w-6 h-6 text-gold-500" aria-hidden />
        <h2 className="text-xl font-bold text-white">ホーム</h2>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
          <p>読み込み中…</p>
          {sessionTimeout && (
            <p className="text-sm text-center">
              <a href="/api/auth/signin?callbackUrl=/" className="text-gold-400 hover:text-gold-300 underline">
                Googleでログイン
              </a>
              するか、ページを再読み込みしてください。
            </p>
          )}
        </div>
      )}

      {status === 'authenticated' && session?.user && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-200 flex items-center gap-1.5">
                <span className="text-gold-500">✓</span> {session.user.name ?? session.user.email ?? 'ユーザー'}
              </p>
              <Link href="/me" className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1">
                <User className="w-4 h-4" /> マイページ
              </Link>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" /> ログアウト
            </button>
          </div>

          {needsProfileSetup && (
            <Link
              href="/me?setup=1"
              className="block p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-100 hover:bg-amber-500/30 transition"
            >
              <p className="font-medium">プロフィールを設定しましょう</p>
              <p className="text-sm mt-1 text-amber-200/90">メンバー表に表示する情報を登録してください</p>
            </Link>
          )}

          {error && (
            <p className="text-sm text-red-300 bg-red-500/20 border border-red-500/50 rounded-xl p-3">{error}</p>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
              <p>読み込み中…</p>
            </div>
          ) : (
            <>
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-gold-500" /> 次回大会の概要
                </h2>
                {tournamentSummaries.length === 0 ? (
                  <p className="text-slate-500 text-sm py-3">次回の大会予定はありません</p>
                ) : (
                  <div className="space-y-2">
                    {tournamentSummaries.map((summary) => (
                      <Link
                        key={summary.firstId}
                        href={`/activities/${summary.firstId}`}
                        className="block p-4 bg-navy-800/80 border-l-4 border-gold-500 rounded-r-xl border border-navy-700/50 hover:border-gold-600/70 hover:bg-navy-800 transition"
                      >
                        <p className="font-medium text-white">
                          {summary.name}、{summary.items.map((a) => formatDateShort(a.startAt)).join('、')}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {summary.placeName}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-gold-500" /> 未確定の出欠
                </h2>
                <p className="text-xs text-slate-500 mb-2">まだ出欠登録をしていない、または△で登録してある活動日</p>
                {unconfirmedActivities.length === 0 ? (
                  <p className="text-slate-500 text-sm py-3">未確定の出欠はありません</p>
                ) : (
                  <div className="space-y-2">
                    {unconfirmedActivities.slice(0, 5).map((a) => (
                      <Link
                        key={a.id}
                        href={`/activities/${a.id}`}
                        className="block p-4 bg-navy-800/80 border-l-4 border-amber-500 rounded-r-xl border border-navy-700/50 hover:border-amber-400/70 hover:bg-navy-800 transition"
                      >
                        <p className="font-medium text-white">{formatActivityTitleWithType(a.title, a.placeName, a.activityType)}</p>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          {formatDateTimeRange(a.startAt, a.endAt)}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {a.placeName}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold-500" /> 直近の活動日程
                </h2>
                {activities.length === 0 ? (
                  <p className="text-slate-500 text-sm py-3">活動日程はありません</p>
                ) : (
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((a) => (
                      <Link
                        key={a.id}
                        href={`/activities/${a.id}`}
                        className="block p-4 bg-navy-800/80 border-l-4 border-navy-600 rounded-r-xl border border-navy-700/50 hover:border-navy-600 hover:bg-navy-800 transition"
                      >
                        <p className="font-medium text-white">{formatActivityTitleWithType(a.title, a.placeName, a.activityType)}</p>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          {formatDateTimeRange(a.startAt, a.endAt)}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {a.placeName}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {status === 'unauthenticated' && (
        <div className="space-y-6">
          <section className="space-y-3 text-slate-300 text-sm">
            <h2 className="text-base font-semibold text-white">このアプリについて</h2>
            <p>
              {APP_PURPOSE}
              チームの活動日程の確認、出欠登録、カレンダーとの同期などにご利用いただけます。
            </p>
            <p>
              利用を開始するには Google アカウントでのログインが必要です。ログイン時に表示名・メールアドレス・プロフィール画像を取得し、スケジュール管理と出欠の記録に利用します。詳細は
              <Link href="/privacy" className="text-gold-400 hover:text-gold-300 underline mx-1">
                プライバシーポリシー
              </Link>
              をご確認ください。
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link href="/terms" className="text-gold-400 hover:text-gold-300 no-underline">
                利用規約
              </Link>
              <span className="text-navy-600">|</span>
              <Link href="/privacy" className="text-gold-400 hover:text-gold-300 no-underline">
                プライバシーポリシー
              </Link>
            </p>
          </section>
          <a
            href="/api/auth/signin?callbackUrl=/"
            className="block w-full py-4 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-xl font-medium text-center no-underline transition"
          >
            利用を開始する（Googleでログイン）
          </a>
        </div>
      )}
    </>
  );
}
