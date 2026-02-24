import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createAttendanceLinkBody } from '@/lib/zod/schemas';
import { nanoid } from 'nanoid';

/**
 * 出欠リンクを作成（ログイン不要、相手チームが候補日程から作成）
 * 作成のたびに新しいユニークなリンクが発行される
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const team = await prisma.team.findUnique({
    where: { publicId },
    select: { id: true },
  });
  if (!team) return apiError('NOT_FOUND', 'チームが見つかりません', 404);

  const raw = await req.json().catch(() => ({}));
  const parsed = createAttendanceLinkBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const { activityIds } = parsed.data;

  const activities = await prisma.activitySchedule.findMany({
    where: {
      id: { in: activityIds },
      teamId: team.id,
      activityType: '未定',
      startAt: { gte: new Date() },
    },
    select: { id: true },
  });

  if (activities.length !== activityIds.length) {
    return apiError('BAD_REQUEST', '一部の日程が見つからないか、このチームの候補日程ではありません', 400);
  }

  const token = nanoid(16);

  await prisma.attendanceLink.create({
    data: {
      token,
      teamId: team.id,
      activities: {
        create: activityIds.map((activityScheduleId) => ({ activityScheduleId })),
      },
    },
  });

  return apiSuccess({ token }, 201);
}
