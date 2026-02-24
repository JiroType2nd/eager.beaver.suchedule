import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { requireOwner } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { enqueueSyncForAllMembers } from '@/lib/tasks';

/**
 * OWNER only. proposal.ourOk && proposal.theirOk && status !== CANCELLED で Event 作成、
 * proposal CONFIRMED、slot があれば BOOKED、UserEventSync 全員 PENDING、Cloud Tasks enqueue.
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
  const proposal = await prisma.proposal.findFirst({
    where: { id, teamId: user.teamId },
    include: { slot: true, activity: true },
  });
  if (!proposal) return apiError('NOT_FOUND', 'Proposal not found', 404);
  if (proposal.status === 'CANCELLED') return apiError('CONFLICT', 'Proposal is cancelled', 409);
  if (!proposal.ourOk || !proposal.theirOk) {
    return apiError('CONFLICT', 'Both ourOk and theirOk must be true', 409);
  }
  if (proposal.confirmedEventId) return apiError('CONFLICT', 'Already confirmed', 409);

  const title = `交流戦 vs ${proposal.opponentName}`;
  const event = await prisma.event.create({
    data: {
      teamId: user.teamId,
      proposalId: proposal.id,
      title,
      startAt: proposal.startAt,
      endAt: proposal.endAt,
      placeName: proposal.slot?.placeName ?? proposal.placeName ?? proposal.activity?.placeName ?? '未定',
      placeUrl: proposal.slot?.placeUrl ?? proposal.placeUrl ?? proposal.activity?.placeUrl ?? undefined,
      notes: proposal.slot?.notes ?? undefined,
      status: 'CONFIRMED',
      createdByUserId: user.id,
      updatedByUserId: user.id,
    },
  });
  await prisma.proposal.update({
    where: { id },
    data: { status: 'CONFIRMED', confirmedEventId: event.id },
  });
  if (proposal.slotId) {
    await prisma.slot.update({
      where: { id: proposal.slotId },
      data: { status: 'BOOKED' },
    });
  }

  const members = await prisma.user.findMany({
    where: { teamId: user.teamId },
    select: { id: true },
  });
  const userIds = members.map((m) => m.id);
  await prisma.userEventSync.createMany({
    data: userIds.map((userId) => ({
      userId,
      eventId: event.id,
      status: 'PENDING',
    })),
  });

  try {
    await enqueueSyncForAllMembers(event.id, userIds, 'UPSERT');
  } catch (e) {
    console.error('[confirm] enqueue sync failed', e);
  }

  return apiSuccess({ eventId: event.id }, 201);
}
