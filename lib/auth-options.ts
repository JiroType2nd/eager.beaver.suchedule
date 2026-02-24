import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { ensureUserByGoogleSub } from '@/lib/auth-google';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/forms.body https://www.googleapis.com/auth/drive.file',
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
