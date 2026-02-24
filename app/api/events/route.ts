import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiSuccess } from '@/lib/api-response';

/** 確定イベント一覧。?upcoming=1 でこれから開始のもののみ。 */
export async function GET(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get('upcoming') === '1';
  const where = {
    teamId: user.teamId,
    status: 'CONFIRMED' as const,
    ...(upcoming ? { startAt: { gte: new Date() } } : {}),
  };
  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: upcoming ? 'asc' : 'desc' },
    include: { proposal: { select: { opponentName: true } } },
  });
  return apiSuccess(events);
}
