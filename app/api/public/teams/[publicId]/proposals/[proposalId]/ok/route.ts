import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { proposalOkBody } from '@/lib/zod/schemas';

/**
 * 外部向け: 相手側が OK を押す。teamPublicId と proposalId で紐付きを検証。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; proposalId: string }> }
) {
  const { publicId, proposalId } = await params;
  const team = await prisma.team.findUnique({
    where: { publicId },
    select: { id: true },
  });
  if (!team) return apiError('NOT_FOUND', 'Team not found', 404);
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, teamId: team.id },
  });
  if (!proposal) return apiError('NOT_FOUND', 'Proposal not found', 404);
  const raw = await req.json().catch(() => ({}));
  const parsed = proposalOkBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  if (parsed.data.side !== 'THEIR') return apiError('BAD_REQUEST', 'Use this endpoint for THEIR only', 400);
  let status = proposal.status;
  if (parsed.data.ok && proposal.ourOk) status = 'READY';
  const updated = await prisma.proposal.update({
    where: { id: proposalId },
    data: { theirOk: parsed.data.ok, status },
  });
  return apiSuccess(updated);
}
