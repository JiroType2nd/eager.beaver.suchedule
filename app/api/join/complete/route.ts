import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

const BODY = {
  teamPublicId: (v: unknown) => typeof v === 'string' && v.length > 0,
};

/**
 * 招待リンク経由でログインしたユーザーを、指定チームに参加させる。
 * 新規ユーザー（自チームのみの1人）の場合のみ、チームを移籍する。
 */
export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;

  const raw = await req.json().catch(() => ({}));
  const teamPublicId = raw.teamPublicId;
  if (!BODY.teamPublicId(teamPublicId)) {
    return apiError('BAD_REQUEST', 'teamPublicId is required', 400);
  }

  const inviteTeam = await prisma.team.findUnique({
    where: { publicId: teamPublicId },
  });
  if (!inviteTeam) return apiError('NOT_FOUND', 'Team not found', 404);

  if (user.teamId === inviteTeam.id) {
    return apiSuccess({ joined: true, message: '既にこのチームのメンバーです' });
  }

  const currentTeamMemberCount = await prisma.user.count({
    where: { teamId: user.teamId },
  });

  if (currentTeamMemberCount > 1) {
    return apiError(
      'FORBIDDEN',
      '既に別のチームに所属しています。チームを変更するには、現在のチームを退会してください。',
      403
    );
  }

  const oldTeamId = user.teamId;
  await prisma.user.update({
    where: { id: user.id },
    data: { teamId: inviteTeam.id },
  });

  const oldTeamUserCount = await prisma.user.count({
    where: { teamId: oldTeamId },
  });
  if (oldTeamUserCount === 0) {
    await prisma.team.delete({ where: { id: oldTeamId } });
  }

  return apiSuccess({ joined: true });
}
