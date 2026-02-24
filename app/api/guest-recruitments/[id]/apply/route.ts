import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

/** ゲスト募集に申し込む（チームメンバーのみ） */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const recruitment = await prisma.guestRecruitment.findFirst({
    where: { id, teamId: user.teamId },
    include: { _count: { select: { applications: true } } },
  });
  if (!recruitment) return apiError('NOT_FOUND', 'Guest recruitment not found', 404);
  if (recruitment._count.applications >= recruitment.capacity) {
    return apiError('BAD_REQUEST', '定員に達しているため申し込めません', 400);
  }
  const existing = await prisma.guestRecruitmentApplication.findUnique({
    where: { guestRecruitmentId_userId: { guestRecruitmentId: id, userId: user.id } },
  });
  if (existing) return apiError('CONFLICT', '既に申し込んでいます', 409);
  await prisma.guestRecruitmentApplication.create({
    data: { guestRecruitmentId: id, userId: user.id },
  });
  return apiSuccess({ ok: true });
}

/** ゲスト募集の申し込みをキャンセル */
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
  await prisma.guestRecruitmentApplication.deleteMany({
    where: { guestRecruitmentId: id, userId: user.id },
  });
  return apiSuccess({ ok: true });
}
