import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { updateActivityScheduleBody } from '@/lib/zod/schemas';

/** 活動日程詳細（出欠一覧含む） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const activity = await prisma.activitySchedule.findFirst({
    where: { id, teamId: user.teamId },
    include: {
      createdBy: { select: { displayName: true } },
      attendances: {
        include: { user: { select: { id: true, displayName: true, memberType: true } } },
      },
    },
  });
  if (!activity) return apiError('NOT_FOUND', 'Activity not found', 404);
  const teamMembers = await prisma.user.findMany({
    where: { teamId: user.teamId },
    select: { id: true, memberType: true },
  });
  const answeredIds = new Set(activity.attendances.map((a) => a.userId));
  const noAnswerCount = teamMembers.length - answeredIds.size;

  const attendanceByUser = new Map(activity.attendances.map((a) => [a.userId, a]));
  const summary: Record<string, { YES: number; MAYBE: number; NO: number; noAnswer: number }> = {
    PLAYER: { YES: 0, MAYBE: 0, NO: 0, noAnswer: 0 },
    MANAGER: { YES: 0, MAYBE: 0, NO: 0, noAnswer: 0 },
  };
  for (const m of teamMembers) {
    const type = (m.memberType ?? 'PLAYER') as 'PLAYER' | 'MANAGER';
    if (!summary[type]) summary[type] = { YES: 0, MAYBE: 0, NO: 0, noAnswer: 0 };
    const att = attendanceByUser.get(m.id);
    if (!att) summary[type].noAnswer++;
    else if (att.answer === 'YES') summary[type].YES++;
    else if (att.answer === 'MAYBE') summary[type].MAYBE++;
    else summary[type].NO++;
  }

  return apiSuccess({
    ...activity,
    noAnswerCount,
    attendanceSummaryByRole: summary,
  });
}

/** 活動日程を編集 */
export async function PATCH(
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
  const parsed = updateActivityScheduleBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.activityType !== undefined) data.activityType = parsed.data.activityType;
  if (parsed.data.startAt != null) data.startAt = typeof parsed.data.startAt === 'string' ? new Date(parsed.data.startAt) : parsed.data.startAt;
  if (parsed.data.endAt != null) data.endAt = typeof parsed.data.endAt === 'string' ? new Date(parsed.data.endAt) : parsed.data.endAt;
  if (parsed.data.placeName != null) data.placeName = parsed.data.placeName;
  if (parsed.data.placeUrl !== undefined) data.placeUrl = parsed.data.placeUrl;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  const updated = await prisma.activitySchedule.update({
    where: { id },
    data,
  });
  return apiSuccess(updated);
}

/** 活動日程を削除（中止時など） */
export async function DELETE(
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
  await prisma.activitySchedule.delete({ where: { id } });
  return apiSuccess({ ok: true });
}
