'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { POSITIONS, MEMBER_TYPE_OPTIONS } from '@/lib/members';

type MeResponse = {
  user: {
    id: string;
    displayName: string;
    role: string;
    memberType?: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    postalCode: string | null;
    address: string | null;
    height: number | null;
    position: string | null;
    uniforms: number[];
  };
  team: { id: string; name: string; logoUrl: string | null; publicId: string };
};

type Tab = 'profile' | 'team';

export function MePageContent({ isSetup = false }: { isSetup?: boolean }) {
  const { status } = useSession();
  const [tab, setTab] = useState<Tab>('profile');
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [height, setHeight] = useState('');
  const [position, setPosition] = useState('');
  const [uniforms, setUniforms] = useState<number[]>([0]);
  const [memberType, setMemberType] = useState<string>('PLAYER');
  const [postalLoading, setPostalLoading] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');
  const [teamSaving, setTeamSaving] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiGet<MeResponse>('/api/me')
      .then((d) => {
        setData(d);
        setFullName(d.user.fullName ?? '');
        setMemberType(d.user.memberType ?? 'PLAYER');
        setPhone(d.user.phone ?? '');
        setPostalCode(d.user.postalCode ?? '');
        setAddress(d.user.address ?? '');
        setHeight(d.user.height != null ? String(d.user.height) : '');
        setPosition(d.user.position ?? '');
        const u = d.user.uniforms;
        setUniforms(Array.isArray(u) && u.length > 0 ? u : [0]);
        setTeamName(d.team.name ?? '');
        setTeamLogoUrl(d.team.logoUrl ?? '');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      })
      .finally(() => setLoading(false));
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        fullName: fullName.trim() || null,
        memberType: memberType as 'PLAYER' | 'MANAGER',
        phone: phone.trim() || null,
        postalCode: postalCode.replace(/-/g, '').trim() || null,
        address: address.trim() || null,
        height: height ? parseInt(height, 10) : null,
        position: position.trim() || null,
        uniforms: uniforms.filter((n) => n > 0),
      };
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message ?? '保存に失敗しました');
      setSuccess(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                fullName: body.fullName,
                memberType: body.memberType,
                phone: body.phone,
                postalCode: body.postalCode,
                address: body.address,
                height: body.height,
                position: body.position,
                uniforms: body.uniforms ?? [],
              },
            }
          : null
      );
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const addUniform = () => setUniforms([...uniforms, 0]);
  const removeUniform = (i: number) => setUniforms(uniforms.filter((_, idx) => idx !== i));
  const updateUniform = (i: number, val: number) => {
    const next = [...uniforms];
    next[i] = val;
    setUniforms(next);
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || data.user.role !== 'OWNER') return;
    setTeamSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: teamName.trim() || undefined,
          logoUrl: teamLogoUrl.trim() || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message ?? '保存に失敗しました');
      setSuccess(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              team: {
                ...prev.team,
                name: teamName.trim(),
                logoUrl: teamLogoUrl.trim() || null,
              },
            }
          : null
      );
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setTeamSaving(false);
    }
  };

  const fetchAddressFromPostalCode = async () => {
    const zip = postalCode.replace(/-/g, '').trim();
    if (zip.length !== 7) {
      setError('7桁の郵便番号を入力してください');
      return;
    }
    setPostalLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/postal-code?zip=${zip}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? '住所が見つかりません');
      setAddress(data.address ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '住所の取得に失敗しました');
    } finally {
      setPostalLoading(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">
          {status === 'loading' ? '読み込み中…' : 'ログインが必要です'}
        </p>
        {status === 'unauthenticated' && (
          <Link href="/api/auth/signin?callbackUrl=/me" className="text-gold-400 hover:text-gold-300 text-sm mt-2 block">
            ログインする
          </Link>
        )}
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">読み込み中…</p>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen p-4 pb-24">
        <p className="text-slate-400">読み込みに失敗しました</p>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </main>
    );
  }

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${data.team.publicId}`
      : '';

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-gold-400 hover:text-gold-300 text-sm">
            ← ホーム
          </Link>
          <h1 className="text-xl font-bold">マイページ</h1>
        </div>

        {isSetup && (
          <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl">
            <p className="text-amber-200 font-medium">プロフィールを設定しましょう</p>
            <p className="text-sm text-amber-200/90 mt-1">
              メンバー表に表示する情報を入力してください。
            </p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm">保存しました</div>
        )}
        {copySuccess && (
          <div className="mb-4 p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm">リンクをコピーしました</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm">{error}</div>
        )}

        {/* プロフィール設定 / チーム設定 タブ（オーナーのみチーム設定表示） */}
        <div className="flex gap-2 mb-6 border-b border-navy-700 pb-2">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'profile'
                ? 'bg-gold-500/30 text-gold-400 border border-gold-500/50'
                : 'text-slate-400 hover:text-slate-300 border border-transparent'
            }`}
          >
            プロフィール設定
          </button>
          {data.user.role === 'OWNER' && (
            <button
              type="button"
              onClick={() => setTab('team')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === 'team'
                  ? 'bg-gold-500/30 text-gold-400 border border-gold-500/50'
                  : 'text-slate-400 hover:text-slate-300 border border-transparent'
              }`}
            >
              チーム設定
            </button>
          )}
        </div>

        {tab === 'profile' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">フルネーム</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={data.user.displayName}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">電話番号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">メールアドレス</label>
            <input
              type="email"
              value={data.user.email ?? ''}
              readOnly
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-slate-300"
            />
            <p className="text-xs text-slate-400 mt-1">
              Googleログイン時のアドレスが自動で反映されます
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">郵便番号</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/[^\d-]/g, ''))}
                placeholder="1000001 または 100-0001"
                maxLength={8}
                className="flex-1 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
              />
              <button
                type="button"
                onClick={fetchAddressFromPostalCode}
                disabled={postalLoading || postalCode.replace(/-/g, '').length !== 7}
                className="px-4 py-2 bg-gold-500/20 text-gold-400 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {postalLoading ? '検索中…' : '住所を検索'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">住所</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="郵便番号から自動入力、または手入力"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">身長（cm）</label>
            <input
              type="number"
              min={50}
              max={300}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">役割</label>
            <select
              value={memberType}
              onChange={(e) => setMemberType(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
            >
              {MEMBER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">出欠集計でプレイヤーとマネージャーを分けて表示します</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">ポジション</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
            >
              <option value="">未選択</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">ユニフォーム番号</label>
            {uniforms.map((n, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={n || ''}
                  onChange={(e) =>
                    updateUniform(i, e.target.value ? parseInt(e.target.value, 10) : 0)
                  }
                  placeholder="番号"
                  className="w-24 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => removeUniform(i)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                >
                  削除
                </button>
              </div>
            ))}
            <button type="button" onClick={addUniform} className="text-sm text-gold-400 hover:text-gold-300">
              + 追加
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gold-500 text-navy-900 hover:bg-gold-400 rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存する'}
          </button>
        </form>
        )}

        {tab === 'team' && data.user.role === 'OWNER' && (
          <form onSubmit={handleTeamSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">チーム名</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="例: 〇〇バスケットボールクラブ"
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">招待リンクの参加画面やメンバー一覧に表示されます</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">チームロゴ（画像URL）</label>
              <input
                type="url"
                value={teamLogoUrl}
                onChange={(e) => setTeamLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500"
              />
              {teamLogoUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={teamLogoUrl}
                    alt="チームロゴ"
                    className="h-12 w-12 object-contain rounded border border-navy-600 bg-navy-800"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <span className="text-xs text-slate-400">プレビュー</span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={teamSaving}
              className="w-full py-3 bg-gold-500 text-navy-900 hover:bg-gold-400 rounded-lg font-medium disabled:opacity-50"
            >
              {teamSaving ? '保存中…' : 'チーム設定を保存する'}
            </button>
          </form>
        )}

        {data.user.role === 'OWNER' && (
          <section className="mt-8 p-4 bg-navy-800/50 rounded-xl border border-navy-700">
            <h2 className="font-medium text-slate-300 mb-2">チームID（オーナー限定）</h2>
            <p className="text-sm text-slate-400 mb-2">
              チーム管理用のIDです。他チームとの識別や運用で使用します。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={data.team.id}
                className="flex-1 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm font-mono text-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(data.team.id);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="px-4 py-2 bg-gold-500/20 text-gold-400 border border-gold-500/50 rounded-lg hover:bg-gold-500/30 text-sm font-medium"
              >
                コピー
              </button>
            </div>
          </section>
        )}

        <section className="mt-8 p-4 bg-navy-800/50 rounded-xl border border-navy-700">
          <h2 className="font-medium text-slate-300 mb-2">チーム招待リンク</h2>
          <p className="text-sm text-slate-400 mb-2">
            このリンクを新規メンバーに送ると、Googleログイン後に自動でチームに参加します。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-slate-200"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
              }}
              className="px-4 py-2 bg-gold-500/20 text-gold-400 border border-gold-500/50 rounded-lg hover:bg-gold-500/30 text-sm font-medium"
            >
              コピー
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
