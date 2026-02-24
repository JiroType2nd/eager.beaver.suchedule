import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { canViewPersonalInfo } from '@/lib/members';
import { apiError, apiSuccess } from '@/lib/api-response';

/**
 * 提案に紐づく活動の活動内容を 交流戦（確定） に変更。
 * 未定 → 交流戦（確定）、交流戦（調整中） → 交流戦（確定）
 * オーナー・大会担当のみ。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  if (!canViewPersonalInfo(user.role)) {
    return apiError('FORBIDDEN', 'オーナーまたは大会担当のみ実行できます', 403);
  }

  const { id: proposalId } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, teamId: user.teamId },
    include: { activity: true },
  });

  if (!proposal) return apiError('NOT_FOUND', '提案が見つかりません', 404);
  if (proposal.status === 'CANCELLED') return apiError('CONFLICT', '中止済みの提案です', 409);

  const activityId = proposal.activityScheduleId ?? proposal.activity?.id;
  if (!activityId) return apiError('CONFLICT', 'この提案には活動が紐づいていません', 409);

  await prisma.activitySchedule.update({
    where: { id: activityId },
    data: { activityType: '交流戦（確定）' },
  });

  return apiSuccess({ activityType: '交流戦（確定）' });
}
