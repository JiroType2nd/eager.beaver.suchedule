import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { bulkUpdateActivityScheduleBody } from '@/lib/zod/schemas';
import { addDays } from 'date-fns';

/** 活動日程を一括で編集 */
export async function PATCH(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = bulkUpdateActivityScheduleBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const { activityIds, placeName, activityType, dateShiftDays } = parsed.data;

  const activities = await prisma.activitySchedule.findMany({
    where: { id: { in: activityIds }, teamId: user.teamId },
  });
  const validIds = new Set(activities.map((a) => a.id));

  const results: { id: string; ok: boolean }[] = [];
  for (const id of activityIds) {
    if (!validIds.has(id)) {
      results.push({ id, ok: false });
      continue;
    }
    const activity = activities.find((a) => a.id === id)!;
    const data: Record<string, unknown> = {};
    if (placeName != null) data.placeName = placeName;
    if (activityType !== undefined) data.activityType = activityType;
    if (dateShiftDays != null) {
      data.startAt = addDays(activity.startAt, dateShiftDays);
      data.endAt = addDays(activity.endAt, dateShiftDays);
    }
    if (Object.keys(data).length === 0) {
      results.push({ id, ok: true });
      continue;
    }
    await prisma.activitySchedule.update({
      where: { id },
      data,
    });
    results.push({ id, ok: true });
  }
  return apiSuccess({ results });
}
