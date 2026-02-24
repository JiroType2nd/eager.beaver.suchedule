import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createExchangeProposalsBody } from '@/lib/zod/schemas';

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
 * 外部向け: 以下の日程以外から調整。複数日程→複数提案＋活動作成。
 * 各活動は activityType=交流戦（調整中）で作成。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) return apiError('BAD_REQUEST', 'Too many requests', 429);

  const { publicId } = await params;
  const team = await prisma.team.findUnique({
    where: { publicId },
    select: { id: true },
  });
  if (!team) return apiError('NOT_FOUND', 'Team not found', 404);

  const owner = await prisma.user.findFirst({
    where: { teamId: team.id, role: 'OWNER' },
    select: { id: true },
  });
  const createdByUserId = owner?.id ?? (await prisma.user.findFirst({
    where: { teamId: team.id },
    select: { id: true },
  }))?.id;
  if (!createdByUserId) return apiError('INTERNAL', 'No team member found', 500);

  const raw = await req.json().catch(() => ({}));
  const parsed = createExchangeProposalsBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const { opponentName, dates } = parsed.data;
  const results: { proposalId: string; activityId: string }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const d of dates) {
      const start = typeof d.startAt === 'string' ? new Date(d.startAt) : d.startAt;
      const end = typeof d.endAt === 'string' ? new Date(d.endAt) : d.endAt;
      const placeName = d.placeName;
      const placeUrl = d.placeUrl ?? undefined;
      const activity = await tx.activitySchedule.create({
        data: {
          teamId: team.id,
          createdByUserId,
          title: `交流戦 vs ${opponentName}`,
          activityType: '交流戦（調整中）',
          startAt: start,
          endAt: end,
          placeName,
          placeUrl,
        },
      });
      const proposal = await tx.proposal.create({
        data: {
          teamId: team.id,
          activityScheduleId: activity.id,
          source: 'OPPONENT',
          opponentName,
          startAt: start,
          endAt: end,
          placeName,
          placeUrl,
        },
      });
      results.push({ proposalId: proposal.id, activityId: activity.id });
    }
  });

  return apiSuccess({ created: results }, 201);
}
