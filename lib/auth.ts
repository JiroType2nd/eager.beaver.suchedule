import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError } from '@/lib/api-response';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export type SessionUser = {
  id: string;
  teamId: string;
  displayName: string;
  role: 'OWNER' | 'STAFF' | 'MEMBER';
  memberType: 'PLAYER' | 'MANAGER';
};

/**
 * API Route 用: セッションからユーザーを取得。未ログインなら null。
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = await getToken({ req, secret: JWT_SECRET });
  if (!token?.sub) return null;
  const user = await prisma.user.findFirst({
    where: { id: token.sub as string },
    select: { id: true, teamId: true, displayName: true, role: true, memberType: true },
  });
  if (!user) return null;
  return user as SessionUser;
}

/**
 * ログイン必須。未ログインなら 401 レスポンスを返す。
 */
export async function requireSessionUser(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) return apiError('UNAUTHORIZED', 'Login required', 401);
  return user;
}

/**
 * OWNER のみ許可。MEMBER なら 403。
 */
export function requireOwner(user: SessionUser): NextResponse | null {
  if (user.role !== 'OWNER') return apiError('FORBIDDEN', 'Owner only', 403);
  return null;
}
