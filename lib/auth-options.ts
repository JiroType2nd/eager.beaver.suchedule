import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { ensureUserByGoogleSub } from '@/lib/auth-google';

// Secret Manager 等で改行混入すると client_id に余分な文字が付き 401 invalid_client になるため、1行目のみ採用
function takeFirstLine(s: string | undefined): string {
  if (!s || typeof s !== 'string') return '';
  const first = s.split(/\r?\n/)[0] ?? '';
  return first.trim();
}
const GOOGLE_CLIENT_ID = takeFirstLine(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = takeFirstLine(process.env.GOOGLE_CLIENT_SECRET);

// 本番で 401 invalid_client 調査用: 長さ・先頭・末尾をログ（改行混入の有無を確認）
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
  const len = GOOGLE_CLIENT_ID.length;
  const expectedSuffix = '.apps.googleusercontent.com';
  const prefix = GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.slice(0, 30)}...` : 'MISSING';
  const endsCorrectly = GOOGLE_CLIENT_ID.endsWith(expectedSuffix);
  console.log('[Auth] GOOGLE_CLIENT_ID length:', len, 'prefix:', prefix, 'endsWith(.apps.googleusercontent.com):', endsCorrectly);
}

// 必要なスコープのみ指定。詳細は docs/OAUTH_SCOPES.md を参照。
// - openid, email, profile: サインイン・ユーザー識別・表示名・メール（Sensitive scope、警告の要因）
// - calendar, calendar.events: カレンダー連携（lib/google-calendar.ts）
const GOOGLE_SCOPE =
  'openid email profile ' +
  'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_SCOPE,
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      const googleSub = (profile as { sub?: string })?.sub ?? (account?.providerAccountId as string);
      if (googleSub) {
        try {
          const displayName = (profile as { name?: string })?.name ?? (token.name as string) ?? '';
          const refresh = account?.refresh_token ?? (token.refreshToken as string) ?? null;
          const email = (profile as { email?: string })?.email ?? null;
          const { id } = await ensureUserByGoogleSub(googleSub, displayName, refresh, email);
          token.sub = id;
          token.googleSub = googleSub;
        } catch (e) {
          console.error('[NextAuth] jwt callback error:', e);
          throw new Error(e instanceof Error ? e.message : 'ログイン処理に失敗しました。.env の DATABASE_URL とマイグレーションを確認してください。');
        }
      }
      if (account?.refresh_token) token.refreshToken = account.refresh_token;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub!;
        (session.user as { googleSub?: string }).googleSub = token.googleSub as string;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { error: '/auth/error' },
  secret: process.env.NEXTAUTH_SECRET,
};
