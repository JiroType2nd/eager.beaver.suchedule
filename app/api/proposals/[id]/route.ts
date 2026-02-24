import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

async function getProposalWithAvailability(id: string, teamId: string) {
  return prisma.proposal.findFirst({
    where: { id, teamId },
    include: {
      slot: true,
      availabilities: {
        include: { user: { select: { id: true, displayName: true, memberType: true } } },
      },
      event: true,
    },
  });
}

/**
 * 出欠集計: player/manager 別、未回答数を含めて返す。
 */
function aggregateAvailability(proposal: NonNullable<Awaited<ReturnType<typeof getProposalWithAvailability>>>) {
  const players = proposal.availabilities.filter((a) => a.user.memberType === 'PLAYER');
  const managers = proposal.availabilities.filter((a) => a.user.memberType === 'MANAGER');
  const yes = (arr: typeof proposal.availabilities) => arr.filter((a) => a.answer === 'YES').length;
  const maybe = (arr: typeof proposal.availabilities) => arr.filter((a) => a.answer === 'MAYBE').length;
  const no = (arr: typeof proposal.availabilities) => arr.filter((a) => a.answer === 'NO').length;
  return {
    players: { yes: yes(players), maybe: maybe(players), no: no(players), total: players.length },
    managers: { yes: yes(managers), maybe: maybe(managers), no: no(managers), total: managers.length },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const proposal = await getProposalWithAvailability(id, user.teamId);
  if (!proposal) return apiError('NOT_FOUND', 'Proposal not found', 404);
  const aggregation = aggregateAvailability(proposal);
  const teamUserIds = await prisma.user.findMany({
    where: { teamId: user.teamId },
    select: { id: true },
  });
  const answeredIds = new Set(proposal.availabilities.map((a) => a.userId));
  const noAnswerCount = teamUserIds.length - answeredIds.size;
  return apiSuccess({
    ...proposal,
    availabilitySummary: aggregation,
    noAnswerCount,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!proposal) return apiError('NOT_FOUND', 'Proposal not found', 404);
  const raw = await req.json().catch(() => ({}));
  const status = raw.status as string | undefined;
  if (status && !['COLLECTING', 'READY', 'CONFIRMED', 'CANCELLED'].includes(status)) {
    return apiError('BAD_REQUEST', 'Invalid status', 400);
  }
  const updated = await prisma.proposal.update({
    where: { id },
    data: status ? { status: status as 'COLLECTING' | 'READY' | 'CONFIRMED' | 'CANCELLED' } : {},
    include: { slot: true },
  });
  return apiSuccess(updated);
}
