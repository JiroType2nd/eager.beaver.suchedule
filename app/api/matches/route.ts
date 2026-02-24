import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createMatchRecordBody } from '@/lib/zod/schemas';

export async function GET(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const records = await prisma.matchRecord.findMany({
    where: { teamId: user.teamId },
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { id: true, title: true, startAt: true } },
      createdBy: { select: { displayName: true } },
      assets: true,
      videoLinks: true,
    },
  });
  return apiSuccess(records);
}

export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = createMatchRecordBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { eventId, opponentName, scoreUs, scoreThem, memo } = parsed.data;
  const event = await prisma.event.findFirst({
    where: { id: eventId, teamId: user.teamId },
  });
  if (!event) return apiError('NOT_FOUND', 'Event not found', 404);
  const record = await prisma.matchRecord.create({
    data: {
      teamId: user.teamId,
      eventId,
      opponentName,
      scoreUs: scoreUs ?? undefined,
      scoreThem: scoreThem ?? undefined,
      memo: memo ?? undefined,
      createdByUserId: user.id,
    },
    include: {
      event: { select: { id: true, title: true } },
      assets: true,
      videoLinks: true,
    },
  });
  return apiSuccess(record, 201);
}
