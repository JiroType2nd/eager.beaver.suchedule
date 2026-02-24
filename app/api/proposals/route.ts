import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createProposalBody } from '@/lib/zod/schemas';

export async function GET(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // COLLECTING, READY, CONFIRMED, CANCELLED または未指定で全件
  const where = {
    teamId: user.teamId,
    ...(status ? { status: status as 'COLLECTING' | 'READY' | 'CONFIRMED' | 'CANCELLED' } : {}),
  };
  const proposals = await prisma.proposal.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: { slot: true, activity: { select: { id: true, activityType: true } } },
  });
  return apiSuccess(proposals);
}

export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = createProposalBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { slotId, activityScheduleId, source, opponentName, startAt, endAt, placeName, placeUrl } = parsed.data;
  let start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  let end = typeof endAt === 'string' ? new Date(endAt) : endAt;
  let place = placeName ?? null;
  let placeU = placeUrl ?? null;

  if (slotId) {
    const slot = await prisma.slot.findFirst({
      where: { id: slotId, teamId: user.teamId, status: 'OPEN' },
    });
    if (!slot) return apiError('NOT_FOUND', 'Slot not found or not OPEN', 404);
    start = slot.startAt;
    end = slot.endAt;
    place = slot.placeName;
    placeU = slot.placeUrl;
  } else if (activityScheduleId) {
    const activity = await prisma.activitySchedule.findFirst({
      where: { id: activityScheduleId, teamId: user.teamId, activityType: '未定' },
    });
    if (!activity) return apiError('NOT_FOUND', '未定の活動日程が見つかりません', 404);
    start = activity.startAt;
    end = activity.endAt;
    place = activity.placeName;
    placeU = activity.placeUrl;
  }

  const proposal = await prisma.proposal.create({
    data: {
      teamId: user.teamId,
      slotId: slotId ?? undefined,
      activityScheduleId: activityScheduleId ?? undefined,
      source,
      opponentName,
      startAt: start,
      endAt: end,
      placeName: place ?? undefined,
      placeUrl: placeU ?? undefined,
    },
    include: { slot: true, activity: true },
  });
  return apiSuccess(proposal, 201);
}
