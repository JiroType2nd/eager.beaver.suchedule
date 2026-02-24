import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createGuestRecruitmentBody } from '@/lib/zod/schemas';

/** ゲスト募集一覧。?upcoming=1 でこれから開始のもののみ */
export async function GET(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get('upcoming') === '1';
  const where: { teamId: string; startAt?: { gte: Date } } = {
    teamId: user.teamId,
  };
  if (upcoming) {
    where.startAt = { gte: new Date() };
  }
  const recruitments = await prisma.guestRecruitment.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: {
      createdBy: { select: { displayName: true } },
      _count: { select: { applications: true } },
    },
  });
  return apiSuccess(
    recruitments.map((r) => ({
      id: r.id,
      title: r.title,
      placeName: r.placeName,
      placeUrl: r.placeUrl,
      level: r.level,
      capacity: r.capacity,
      feeYen: r.feeYen,
      startAt: r.startAt,
      endAt: r.endAt,
      notes: r.notes,
      createdBy: r.createdBy,
      applicationCount: r._count.applications,
      isFull: r._count.applications >= r.capacity,
    }))
  );
}

/** ゲスト募集を作成 */
export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = createGuestRecruitmentBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { title, placeName, placeUrl, level, capacity, feeYen, startAt, endAt, notes } = parsed.data;
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  const end = typeof endAt === 'string' ? new Date(endAt) : endAt;
  const recruitment = await prisma.guestRecruitment.create({
    data: {
      teamId: user.teamId,
      createdByUserId: user.id,
      title: title?.trim() || null,
      placeName,
      placeUrl: placeUrl ?? null,
      level,
      capacity,
      feeYen: feeYen ?? 0,
      startAt: start,
      endAt: end,
      notes: notes?.trim() || null,
    },
    include: { createdBy: { select: { displayName: true } } },
  });
  return apiSuccess(recruitment, 201);
}
