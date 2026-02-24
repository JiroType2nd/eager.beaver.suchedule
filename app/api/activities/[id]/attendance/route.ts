import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { putActivityAttendanceBody } from '@/lib/zod/schemas';

/** 自分の出欠取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const activity = await prisma.activitySchedule.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!activity) return apiError('NOT_FOUND', 'Activity not found', 404);
  const att = await prisma.activityAttendance.findUnique({
    where: { activityScheduleId_userId: { activityScheduleId: id, userId: user.id } },
  });
  return apiSuccess(att ?? null);
}

/** 出欠登録・更新 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const activity = await prisma.activitySchedule.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!activity) return apiError('NOT_FOUND', 'Activity not found', 404);
  const raw = await req.json().catch(() => ({}));
  const parsed = putActivityAttendanceBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { answer, lateAt, leaveAt, comment } = parsed.data;
  const data = {
    answer,
    lateAt: lateAt != null ? (typeof lateAt === 'string' ? new Date(lateAt) : lateAt) : null,
    leaveAt: leaveAt != null ? (typeof leaveAt === 'string' ? new Date(leaveAt) : leaveAt) : null,
    comment: comment ?? null,
  };
  const att = await prisma.activityAttendance.upsert({
    where: { activityScheduleId_userId: { activityScheduleId: id, userId: user.id } },
    create: { activityScheduleId: id, userId: user.id, ...data },
    update: data,
  });
  return apiSuccess(att);
}
