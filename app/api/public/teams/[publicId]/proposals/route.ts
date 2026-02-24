import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createProposalBody } from '@/lib/zod/schemas';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

/**
 * 外部向け: 匿名で提案作成。source=OPPONENT 固定。レート制限あり。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return apiError('BAD_REQUEST', 'Too many requests', 429);
  }
  const { publicId } = await params;
  const team = await prisma.team.findUnique({
    where: { publicId },
    select: { id: true },
  });
  if (!team) return apiError('NOT_FOUND', 'Team not found', 404);

  const raw = await req.json().catch(() => ({}));
  const parsed = createProposalBody.safeParse({
    ...raw,
    source: 'OPPONENT',
  });
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { slotId, activityScheduleId, opponentName, startAt, endAt, placeName, placeUrl } = parsed.data;
  let start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  let end = typeof endAt === 'string' ? new Date(endAt) : endAt;
  let place = placeName ?? undefined;
  let placeU = placeUrl ?? undefined;

  if (slotId) {
    const slot = await prisma.slot.findFirst({
      where: { id: slotId, teamId: team.id, status: 'OPEN' },
    });
    if (!slot) return apiError('NOT_FOUND', 'Slot not found or not OPEN', 404);
    start = slot.startAt;
    end = slot.endAt;
  } else if (activityScheduleId) {
    const activity = await prisma.activitySchedule.findFirst({
      where: { id: activityScheduleId, teamId: team.id, activityType: '未定' },
    });
    if (!activity) return apiError('NOT_FOUND', '候補日程が見つかりません', 404);
    start = activity.startAt;
    end = activity.endAt;
    place = activity.placeName;
    placeU = activity.placeUrl ?? undefined;
  }

  const proposal = await prisma.proposal.create({
    data: {
      teamId: team.id,
      slotId: slotId ?? undefined,
      activityScheduleId: activityScheduleId ?? undefined,
      source: 'OPPONENT',
      opponentName,
      startAt: start,
      endAt: end,
      placeName: place,
      placeUrl: placeU,
    },
    include: { slot: true, activity: true },
  });
  return apiSuccess(proposal, 201);
}
