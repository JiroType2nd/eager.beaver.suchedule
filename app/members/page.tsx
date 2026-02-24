'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { getDisplayFullName, getRoleLabel, getMemberTypeLabel, ROLE_OPTIONS, MEMBER_TYPE_OPTIONS } from '@/lib/members';

type MemberBase = {
  id: string;
  displayName: string;
  fullName: string | null;
  role: string;
  memberType: string;
  height: number | null;
  position: string | null;
  uniforms: { number: number; type: string | null }[];
};

type MemberAdmin = MemberBase & {
  role: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  participationRate: number | null;
};

type MembersResponse = {
  members: MemberBase[] | MemberAdmin[];
  isAdmin: boolean;
  isOwner: boolean;
  currentUserId: string;
  teamPublicId?: string | null;
};

function MembersPageContent() {
  const { status } = useSession();
  const [data, setData] = useState<MembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);
  const [updatingMemberTypeFor, setUpdatingMemberTypeFor] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const t = setTimeout(() => {
      if (mountedRef.current) setSessionTimeout(true);
    }, 5000);
    return () => {
      mountedRef.current = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setTimedOut(false);
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) setTimedOut(true);
    }, 8000);

    apiGet<MembersResponse>('/api/members')
      .then((d) => {
        if (mountedRef.current) {
          setData(d);
          setTimedOut(false);
        }
      })
      .catch((e) => {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : '読み込みに失敗しました');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (mountedRef.current) setLoading(false);
      });
  }, [status]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen p-4">
        <p className="text-slate-400">読み込み中…</p>
        {sessionTimeout && (
          <p className="text-sm text-amber-600 mt-4">
            セッションの読み込みに時間がかかっています。
            <Link href="/" className="text-gold-400 hover:text-gold-300 underline ml-1">ホーム</Link>
            に戻るか、ページを再読み込みしてください。
          </p>
        )}
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4">
        <p className="text-slate-400">ログインが必要です</p>
        <Link href="/api/auth/signin?callbackUrl=/members" className="text-gold-400 hover:text-gold-300 text-sm mt-2 block">
          ログインする
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-slate-400 mt-2">
          データベースのマイグレーションが未適用の可能性があります。ターミナルで <code className="bg-navy-700 px-1">npm run db:push</code> を実行してください。
        </p>
        <Link href="/" className="text-gold-400 hover:text-gold-300 text-sm mt-4 block">ホームに戻る</Link>
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">読み込み中…</p>
        {timedOut && (
          <p className="text-sm text-amber-600 mt-4">
            時間がかかっています。ページを再読み込みするか、
            <code className="bg-navy-700 px-1 mx-1">npm run db:push</code>
            でDBマイグレーションを実行してください。
          </p>
        )}
      </main>
    );
  }

  const { members, isAdmin, isOwner, currentUserId, teamPublicId } = data;

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setRoleError(null);
    setUpdatingRoleFor(memberId);
    try {
      await apiPatch<{ role: string }>(`/api/members/${memberId}`, { role: newRole });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.id === memberId ? { ...m, role: newRole } : m
          ),
        };
      });
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : '権限の変更に失敗しました');
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  const handleMemberTypeChange = async (memberId: string, newMemberType: string) => {
    setRoleError(null);
    setUpdatingMemberTypeFor(memberId);
    try {
      await apiPatch<{ memberType: string }>(`/api/members/${memberId}`, { memberType: newMemberType });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.id === memberId ? { ...m, memberType: newMemberType } : m
          ),
        };
      });
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : '役割の変更に失敗しました');
    } finally {
      setUpdatingMemberTypeFor(null);
    }
  };
  const inviteUrl =
    typeof window !== 'undefined' && teamPublicId
      ? `${window.location.origin}/join/${teamPublicId}`
      : '';

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredMembers = members.filter((m) => m.displayName !== 'オーナー');
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const cmp = (x: number, y: number) => (sortAsc ? x - y : y - x);
    const strCmp = (x: string, y: string) => {
      const r = (x ?? '').localeCompare(y ?? '', 'ja');
      return sortAsc ? r : -r;
    };
    switch (sortKey) {
      case 'name':
        return strCmp(getDisplayFullName(a), getDisplayFullName(b));
      case 'height':
        return cmp(a.height ?? 0, b.height ?? 0);
      case 'position':
        return strCmp(a.position ?? '', b.position ?? '');
      case 'uniform':
        return cmp(
          a.uniforms[0]?.number ?? 999,
          b.uniforms[0]?.number ?? 999
        );
      case 'participationRate':
        return cmp(
          (a as MemberAdmin).participationRate ?? -1,
          (b as MemberAdmin).participationRate ?? -1
        );
      default:
        return 0;
    }
  });

  const Th = ({
    sortKeyName,
    children,
  }: {
    sortKeyName: string;
    children: React.ReactNode;
  }) => (
    <th
      className="text-left py-3 px-2 font-medium text-slate-400 cursor-pointer hover:bg-navy-800 select-none"
      onClick={() => handleSort(sortKeyName)}
    >
      {children}
      {sortKey === sortKeyName && (
        <span className="ml-1 text-xs">{sortAsc ? '▲' : '▼'}</span>
      )}
    </th>
  );

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-gold-400 hover:text-gold-300 text-sm">
            ← ホーム
          </Link>
          <h1 className="text-xl font-bold text-white">メンバー表</h1>
        </div>

        {filteredMembers.length === 0 ? (
          <p className="text-slate-400 text-center py-12">メンバーがいません</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <Th sortKeyName="name">氏名</Th>
                  <th className="text-left py-3 px-2 font-medium text-slate-400">権限</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-400">役割</th>
                  <Th sortKeyName="height">身長</Th>
                  <Th sortKeyName="position">ポジション</Th>
                  <Th sortKeyName="uniform">ユニフォーム</Th>
                  {isAdmin && (
                    <>
                      <th className="text-left py-3 px-2 font-medium text-slate-400">電話</th>
                      <th className="text-left py-3 px-2 font-medium text-slate-400">メール</th>
                      <th className="text-left py-3 px-2 font-medium text-slate-400">住所</th>
                      <Th sortKeyName="participationRate">参加率</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m) => {
                  const isSelf = m.id === currentUserId;
                  const canEditRole = isOwner && !isSelf;
                  return (
                  <tr key={m.id} className="border-b border-navy-800">
                    <td className="py-3 px-2">{getDisplayFullName(m)}</td>
                    <td className="py-3 px-2">
                      {canEditRole ? (
                        <select
                          value={m.role}
                          disabled={updatingRoleFor === m.id}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="text-sm border border-navy-600 rounded px-2 py-1 bg-navy-800 text-white disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400">
                          {getRoleLabel(m.role)}
                          {isSelf && <span className="text-xs text-slate-500 ml-1">(自分)</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {isAdmin ? (
                        <select
                          value={m.memberType ?? 'PLAYER'}
                          disabled={updatingMemberTypeFor === m.id}
                          onChange={(e) => handleMemberTypeChange(m.id, e.target.value)}
                          className="text-sm border border-navy-600 rounded px-2 py-1 bg-navy-800 text-white disabled:opacity-50"
                        >
                          {MEMBER_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400">{getMemberTypeLabel(m.memberType ?? 'PLAYER')}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">{m.height != null ? `${m.height}cm` : '-'}</td>
                    <td className="py-3 px-2">{m.position ?? '-'}</td>
                    <td className="py-3 px-2">
                      {m.uniforms.length > 0
                        ? m.uniforms.map((u) => u.number).join(', ')
                        : '-'}
                    </td>
                    {isAdmin && (
                      <>
                        <td className="py-3 px-2 text-slate-400">
                          {(m as MemberAdmin).phone ?? '-'}
                        </td>
                        <td className="py-3 px-2 text-slate-400 truncate max-w-[120px]">
                          {(m as MemberAdmin).email ?? '-'}
                        </td>
                        <td className="py-3 px-2 text-slate-400 truncate max-w-[120px]">
                          {(m as MemberAdmin).address ?? '-'}
                        </td>
                        <td className="py-3 px-2">
                          {(m as MemberAdmin).participationRate != null
                            ? `${(m as MemberAdmin).participationRate}%`
                            : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}

        {roleError && (
          <p className="text-sm text-red-300 mt-4 bg-red-500/20 p-3 rounded-lg">
            {roleError}
          </p>
        )}
        {isOwner && (
          <p className="text-xs text-slate-500 mt-4">
            ※ 権限の変更はオーナーのみ可能です。自分の権限は変更できません。
          </p>
        )}
        <p className="text-xs text-slate-500 mt-2">
          ※ オーナー＝チーム作成者。大会担当＝個人情報閲覧・交流戦日程の調整が可能。メンバー＝一般利用。
        </p>
        {isAdmin && (
          <>
            <p className="text-xs text-slate-500 mt-2">
              ※ 電話・メール・住所・参加率はオーナー・大会担当のみ表示されています
            </p>
            <section className="mt-6 p-4 bg-navy-800/50 rounded-xl border border-navy-700">
              <h2 className="font-medium text-slate-300 mb-2">チーム招待リンク</h2>
              <p className="text-sm text-slate-400 mb-2">
                このリンクを新規メンバーに送ると、Googleログイン後に自動でチームに参加します。
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 px-3 py-2 bg-navy-800 border border-navy-600 text-white rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inviteUrl) {
                      navigator.clipboard.writeText(inviteUrl);
                    }
                  }}
                  className="px-4 py-2 bg-gold-500/20 text-gold-400 border border-gold-500/50 rounded-lg hover:bg-gold-500/30 text-sm font-medium"
                >
                  コピー
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-4">
          <p className="text-slate-400">読み込み中…</p>
        </main>
      }
    >
      <MembersPageContent />
    </Suspense>
  );
}
