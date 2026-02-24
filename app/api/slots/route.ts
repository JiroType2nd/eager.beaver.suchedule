import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createSlotBody } from '@/lib/zod/schemas';

export async function GET(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as 'OPEN' | 'BOOKED' | 'CANCELLED' | null;
  const slots = await prisma.slot.findMany({
    where: {
      teamId: user.teamId,
      ...(status ? { status } : {}),
    },
    orderBy: { startAt: 'asc' },
    include: {
      createdBy: { select: { id: true, displayName: true } },
    },
  });
  return apiSuccess(slots);
}

export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = createSlotBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { startAt, endAt, placeName, placeUrl, placeReason, notes } = parsed.data;
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  const end = typeof endAt === 'string' ? new Date(endAt) : endAt;
  const slot = await prisma.slot.create({
    data: {
      teamId: user.teamId,
      createdByUserId: user.id,
      startAt: start,
      endAt: end,
      placeName,
      placeUrl: placeUrl ?? undefined,
      placeReason: placeReason ?? undefined,
      notes: notes ?? undefined,
    },
    include: {
      createdBy: { select: { id: true, displayName: true } },
    },
  });
  return apiSuccess(slot, 201);
}
