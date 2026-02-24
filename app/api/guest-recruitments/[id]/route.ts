import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

/** ゲスト募集詳細（申込一覧含む） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const recruitment = await prisma.guestRecruitment.findFirst({
    where: { id, teamId: user.teamId },
    include: {
      createdBy: { select: { displayName: true } },
      applications: {
        include: { user: { select: { id: true, displayName: true } } },
      },
    },
  });
  if (!recruitment) return apiError('NOT_FOUND', 'Guest recruitment not found', 404);
  const applicationCount = recruitment.applications.length;
  const isFull = applicationCount >= recruitment.capacity;
  const myApplication = recruitment.applications.find((a) => a.userId === user.id);
  return apiSuccess({
    ...recruitment,
    applicationCount,
    isFull,
    myApplication: myApplication
      ? { id: myApplication.id, userId: myApplication.userId }
      : null,
  });
}

/** ゲスト募集を削除 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const recruitment = await prisma.guestRecruitment.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!recruitment) return apiError('NOT_FOUND', 'Guest recruitment not found', 404);
  await prisma.guestRecruitment.delete({ where: { id } });
  return apiSuccess({ ok: true });
}
