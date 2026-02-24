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
  Bell,
  ClipboardList,
  LogOut,
  User,
  Plus,
  Loader2,
} from 'lucide-react';
import { formatDateTimeRange, formatActivityTitleWithType } from '@/lib/date-utils';
import { apiGet } from '@/lib/api-client';

type Event = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  placeName: string;
  placeUrl: string | null;
  status: string;
  proposal: { opponentName: string };
};

type Proposal = {
  id: string;
  opponentName: string;
  startAt: string;
  endAt: string;
  status: string;
  theirOk: boolean;
  ourOk: boolean;
  slot: { placeName: string } | null;
};

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  placeName: string;
  status: string;
};

type Activity = {
  id: string;
  title: string | null;
  activityType: string | null;
  startAt: string;
  endAt: string;
  placeName: string;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
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
      apiGet<Event[]>('/api/events?upcoming=1').catch(() => []),
      apiGet<Activity[]>('/api/activities?upcoming=1').catch(() => []),
      apiGet<Proposal[]>('/api/proposals')
        .then((p) => (Array.isArray(p) ? p : []).filter((x) => x.status === 'COLLECTING' || x.status === 'READY'))
        .catch(() => []),
      apiGet<Slot[]>('/api/slots?status=OPEN').catch(() => []),
      apiGet<{ user: { fullName: string | null } }>('/api/me').catch(() => ({ user: { fullName: null } })),
    ])
      .then(([e, a, p, s, me]) => {
        setEvents(e);
        setActivities(a);
        setProposals(p);
        setSlots(s);
        setNeedsProfileSetup(!me?.user?.fullName?.trim());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <main className="min-h-screen pb-24 bg-navy-900 font-brand">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Home className="w-6 h-6 text-gold-500" aria-hidden />
          <h1 className="text-xl font-bold text-white">交流戦スケジュール</h1>
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
                {/* 活動日程 */}
                <section>
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold-500" /> 活動日程
                  </h2>
                  {activities.length === 0 ? (
                    <p className="text-slate-500 text-sm py-3">活動日程はありません</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.slice(0, 3).map((a) => (
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

                {/* 次回の確定イベント（交流戦） */}
                <section>
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-gold-500" /> 次回イベント（交流戦）
                  </h2>
                  {events.length === 0 ? (
                    <p className="text-slate-500 text-sm py-3">確定イベントはありません</p>
                  ) : (
                    <div className="space-y-2">
                      {events.slice(0, 3).map((e) => (
                        <Link
                          key={e.id}
                          href={`/events/${e.id}`}
                          className="block p-4 bg-navy-800/80 border-l-4 border-gold-500 rounded-r-xl border border-navy-700/50 hover:border-gold-600/70 hover:bg-navy-800 transition"
                        >
                          <p className="font-medium text-white">{e.title}</p>
                          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            {formatDateTimeRange(e.startAt, e.endAt)}
                          </p>
                          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            {e.placeName}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {/* 募集中の提案 */}
                <section>
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gold-500" /> 募集中の提案
                  </h2>
                  {proposals.length === 0 ? (
                    <p className="text-slate-500 text-sm py-3">募集中の提案はありません</p>
                  ) : (
                    <div className="space-y-2">
                      {proposals.map((p) => (
                        <Link
                          key={p.id}
                          href={`/proposals/${p.id}`}
                          className="block p-4 bg-navy-800/80 border-l-4 border-amber-500 rounded-r-xl border border-navy-700/50 hover:border-amber-400/70 hover:bg-navy-800 transition"
                        >
                          <p className="font-medium text-white">vs {p.opponentName}</p>
                          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            {formatDateTimeRange(p.startAt, p.endAt)}
                          </p>
                          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            {p.slot?.placeName ?? '場所未定'}
                          </p>
                          <span className={`inline-flex items-center gap-1 text-xs mt-2 px-2 py-0.5 rounded-full ${p.status === 'READY' ? 'bg-gold-500/20 text-gold-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {p.status === 'READY' ? '双方OK済・確定待ち' : '出欠収集中'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {/* 未決定の枠 */}
                <section>
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gold-500" /> 未決定の枠
                  </h2>
                  {slots.length === 0 ? (
                    <p className="text-slate-500 text-sm py-3">未決定の枠はありません</p>
                  ) : (
                    <div className="space-y-2">
                      {slots.map((s) => (
                        <Link
                          key={s.id}
                          href={`/slots/${s.id}`}
                          className="block p-4 bg-navy-800/80 border-l-4 border-navy-500 rounded-r-xl border border-navy-700/50 hover:border-navy-400 hover:bg-navy-800 transition"
                        >
                          <p className="font-medium text-white flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 flex-shrink-0 text-slate-500" />
                            {s.placeName}
                          </p>
                          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            {formatDateTimeRange(s.startAt, s.endAt)}
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
            <p className="text-slate-300 mb-6">
              ログイン後、次回イベント・募集中提案・未決定枠が表示されます。
            </p>
            <p className="text-sm text-slate-500">※ 同じタブでGoogleのログイン画面に遷移します</p>
            <a
              href="/api/auth/signin?callbackUrl=/"
              className="block w-full py-4 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-xl font-medium text-center no-underline transition"
            >
              Googleでログイン
            </a>
          </div>
        )}
      </div>

      {/* FAB（枠作成） */}
      {status === 'authenticated' && (
        <Link
          href="/slots/new"
          className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-gold-500 text-navy-900 shadow-lg flex items-center justify-center hover:bg-gold-400 transition z-10"
          title="枠を作成"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </Link>
      )}
    </main>
  );
}
