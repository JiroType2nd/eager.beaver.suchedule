import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { updateTeamBody } from '@/lib/zod/schemas';

/** チーム情報の更新（オーナーのみ） */
export async function PATCH(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  if (user.role !== 'OWNER')
    return apiError('FORBIDDEN', 'チーム設定はオーナーのみ変更できます', 403);

  const raw = await req.json().catch(() => ({}));
  const parsed = updateTeamBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const { name, logoUrl } = parsed.data;
  const team = await prisma.team.update({
    where: { id: user.teamId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
    },
    select: { id: true, name: true, logoUrl: true, publicId: true },
  });
  return apiSuccess(team);
}
