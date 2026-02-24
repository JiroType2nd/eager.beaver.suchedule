import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { putBulkAttendanceBody } from '@/lib/zod/schemas';

/** 一括で出欠を登録 */
export async function PUT(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = putBulkAttendanceBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const activityIds = Array.from(new Set(parsed.data.items.map((i) => i.activityId)));
  const activities = await prisma.activitySchedule.findMany({
    where: { id: { in: activityIds }, teamId: user.teamId },
    select: { id: true },
  });
  const validIds = new Set(activities.map((a) => a.id));

  const results: { activityId: string; ok: boolean }[] = [];
  for (const item of parsed.data.items) {
    if (!validIds.has(item.activityId)) {
      results.push({ activityId: item.activityId, ok: false });
      continue;
    }
    await prisma.activityAttendance.upsert({
      where: {
        activityScheduleId_userId: {
          activityScheduleId: item.activityId,
          userId: user.id,
        },
      },
      create: {
        activityScheduleId: item.activityId,
        userId: user.id,
        answer: item.answer,
      },
      update: { answer: item.answer },
    });
    results.push({ activityId: item.activityId, ok: true });
  }
  return apiSuccess({ results });
}
