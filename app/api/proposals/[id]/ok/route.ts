import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { proposalOkBody } from '@/lib/zod/schemas';

/**
 * OUR: ログイン必須。THEIR: 外部からも可能（teamPublicId に紐付いた提案URLで認証する想定）。
 * ここでは OUR のみ実装。THEIR は公開 API で別途。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  const parsed = proposalOkBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  if (parsed.data.side !== 'OUR') return apiError('BAD_REQUEST', 'Use public API for THEIR', 400);
  const proposal = await prisma.proposal.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!proposal) return apiError('NOT_FOUND', 'Proposal not found', 404);
  const ourOk = parsed.data.ok;
  let status = proposal.status;
  if (ourOk && proposal.theirOk) status = 'READY';
  const updated = await prisma.proposal.update({
    where: { id },
    data: { ourOk, status },
  });
  return apiSuccess(updated);
}
