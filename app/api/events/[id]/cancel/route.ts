import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { requireOwner } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { enqueueSyncForAllMembers } from '@/lib/tasks';

/**
 * OWNER only. status=CANCELLED、全ユーザーに DELETE 同期タスク enqueue.
 */
export async function POST(
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
  if (event.status === 'CANCELLED') return apiError('CONFLICT', 'Already cancelled', 409);

  await prisma.event.update({
    where: { id },
    data: { status: 'CANCELLED', updatedByUserId: user.id },
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
    await enqueueSyncForAllMembers(id, members.map((m) => m.id), 'DELETE');
  } catch (e) {
    console.error('[events cancel] enqueue sync failed', e);
  }
  return apiSuccess({ ok: true });
}
