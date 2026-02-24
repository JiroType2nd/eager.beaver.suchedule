import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { requireOwner } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { updateEventBody } from '@/lib/zod/schemas';
import { enqueueSyncForAllMembers } from '@/lib/tasks';

async function getEventAndCheck(id: string, teamId: string) {
  return prisma.event.findFirst({
    where: { id, teamId, status: 'CONFIRMED' },
    include: { proposal: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: { id, teamId: user.teamId },
    include: {
      proposal: {
        include: {
          availabilities: {
            include: { user: { select: { displayName: true, memberType: true } } },
          },
        },
      },
      createdBy: { select: { displayName: true } },
    },
  });
  if (!event) return apiError('NOT_FOUND', 'Event not found', 404);
  return apiSuccess(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const forbidden = requireOwner(user);
  if (forbidden) return forbidden;
  const { id } = await params;
  const event = await getEventAndCheck(id, user.teamId);
  if (!event) return apiError('NOT_FOUND', 'Event not found', 404);
  const raw = await req.json().catch(() => ({}));
  const parsed = updateEventBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const data: Record<string, unknown> = {};
  if (parsed.data.title != null) data.title = parsed.data.title;
  if (parsed.data.startAt != null) data.startAt = typeof parsed.data.startAt === 'string' ? new Date(parsed.data.startAt) : parsed.data.startAt;
  if (parsed.data.endAt != null) data.endAt = typeof parsed.data.endAt === 'string' ? new Date(parsed.data.endAt) : parsed.data.endAt;
  if (parsed.data.placeName != null) data.placeName = parsed.data.placeName;
  if (parsed.data.placeUrl !== undefined) data.placeUrl = parsed.data.placeUrl;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  data.updatedByUserId = user.id;

  const updated = await prisma.event.update({
    where: { id },
    data,
  });
  await prisma.userEventSync.updateMany({
    where: { eventId: id },
    data: { status: 'PENDING', lastError: null },
  });
  const members = await prisma.user.findMany({
    where: { teamId: user.teamId },
    select: { id: true },
  });
  try {
    await enqueueSyncForAllMembers(id, members.map((m) => m.id), 'UPSERT');
  } catch (e) {
    console.error('[events PATCH] enqueue sync failed', e);
  }
  return apiSuccess(updated);
}

/** 中止済みイベントを削除 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const forbidden = requireOwner(user);
  if (forbidden) return forbidden;
  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!event) return apiError('NOT_FOUND', 'Event not found', 404);
  if (event.status !== 'CANCELLED') {
    return apiError('CONFLICT', 'Can only delete cancelled events', 409);
  }
  await prisma.event.delete({ where: { id } });
  return apiSuccess({ ok: true });
}
