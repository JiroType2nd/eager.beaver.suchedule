import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createActivityScheduleBody } from '@/lib/zod/schemas';

/** 活動日程一覧。?upcoming=1 でこれから開始のもののみ。?from=&to= で日付範囲指定（ISO）。?view=matrix でマトリックス用データ（活動+メンバー+出欠） */
export async function GET(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { searchParams } = new URL(req.url);
  const viewMatrix = searchParams.get('view') === 'matrix';
  const upcoming = searchParams.get('upcoming') === '1';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const activityType = searchParams.get('activityType');
  const where: { teamId: string; startAt?: { gte?: Date; lte?: Date }; activityType?: string } = {
    teamId: user.teamId,
  };
  if (upcoming) {
    where.startAt = { gte: new Date() };
  } else if (from || to) {
    const gte = from ? new Date(from) : undefined;
    const lte = to ? new Date(to) : undefined;
    if (gte && lte) where.startAt = { gte, lte };
    else if (gte) where.startAt = { gte };
    else if (lte) where.startAt = { lte };
  }
  if (activityType) where.activityType = activityType;
  const activities = await prisma.activitySchedule.findMany({
    where,
    orderBy: { startAt: upcoming || from ? 'asc' : 'desc' },
    include: viewMatrix
      ? { createdBy: { select: { displayName: true } }, attendances: { select: { userId: true, answer: true } } }
      : { createdBy: { select: { displayName: true } } },
  });

  if (viewMatrix) {
    const members = await prisma.user.findMany({
      where: { teamId: user.teamId, displayName: { not: 'オーナー' } },
      select: { id: true, displayName: true, memberType: true },
      orderBy: { displayName: 'asc' },
    });
    const attendanceMap: Record<string, Record<string, string>> = {};
    const activitiesWithAtt = activities as Array<typeof activities[0] & { attendances: { userId: string; answer: string }[] }>;
    for (const a of activitiesWithAtt) {
      attendanceMap[a.id] = {};
      for (const att of a.attendances) {
        attendanceMap[a.id][att.userId] = att.answer;
      }
    }
    const activitiesForMatrix = activitiesWithAtt.map(({ attendances: _a, ...rest }) => rest);
    return apiSuccess({
      activities: activitiesForMatrix,
      members,
      attendanceMap,
      currentUserId: user.id,
    });
  }

  return apiSuccess(activities);
}

export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = createActivityScheduleBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { title, activityType, startAt, endAt, placeName, placeUrl, notes } = parsed.data;
  const titleVal = title?.trim() || null;
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  const end = typeof endAt === 'string' ? new Date(endAt) : endAt;
  const activity = await prisma.activitySchedule.create({
    data: {
      teamId: user.teamId,
      createdByUserId: user.id,
      title: titleVal ?? undefined,
      activityType: activityType ?? undefined,
      startAt: start,
      endAt: end,
      placeName,
      placeUrl: placeUrl ?? undefined,
      notes: notes ?? undefined,
    },
    include: { createdBy: { select: { displayName: true } } },
  });
  return apiSuccess(activity, 201);
}
