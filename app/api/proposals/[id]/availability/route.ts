import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { putAvailabilityBody } from '@/lib/zod/schemas';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!proposal) return apiError('NOT_FOUND', 'Proposal not found', 404);
  const av = await prisma.availability.findUnique({
    where: { proposalId_userId: { proposalId: id, userId: user.id } },
  });
  return apiSuccess(av ?? null);
}

export async function PUT(
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
  if (proposal.status === 'CONFIRMED' || proposal.status === 'CANCELLED') {
    return apiError('CONFLICT', 'Proposal is already confirmed or cancelled', 409);
  }
  const raw = await req.json().catch(() => ({}));
  const parsed = putAvailabilityBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { answer, lateAt, leaveAt, comment } = parsed.data;
  const data = {
    answer,
    lateAt: lateAt != null ? (typeof lateAt === 'string' ? new Date(lateAt) : lateAt) : null,
    leaveAt: leaveAt != null ? (typeof leaveAt === 'string' ? new Date(leaveAt) : leaveAt) : null,
    comment: comment ?? null,
  };
  const av = await prisma.availability.upsert({
    where: { proposalId_userId: { proposalId: id, userId: user.id } },
    create: { proposalId: id, userId: user.id, ...data },
    update: data,
  });
  return apiSuccess(av);
}
