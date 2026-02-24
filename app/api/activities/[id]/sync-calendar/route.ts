import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { upsertCalendarEvent } from '@/lib/google-calendar';

/** 自分のGoogleカレンダーに出欠が不要な活動日程を同期（追加/更新） */
export async function POST(
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

  let sync = await prisma.userActivitySync.findUnique({
    where: {
      userId_activityScheduleId: { userId: user.id, activityScheduleId: id },
    },
  });
  if (!sync) {
    sync = await prisma.userActivitySync.create({
      data: {
        userId: user.id,
        activityScheduleId: id,
        status: 'PENDING',
      },
    });
  }

  const title = activity.title || `${activity.activityType || '活動'} @ ${activity.placeName}`;
  const payload = {
    title,
    startAt: activity.startAt,
    endAt: activity.endAt,
    placeName: activity.placeName,
    placeUrl: activity.placeUrl ?? undefined,
    notes: activity.notes ?? undefined,
  };

  try {
    const googleEventId = await upsertCalendarEvent(
      user.id,
      sync.googleEventId,
      payload
    );
    await prisma.userActivitySync.update({
      where: {
        userId_activityScheduleId: { userId: user.id, activityScheduleId: id },
      },
      data: { status: 'SYNCED', googleEventId, lastError: null },
    });
    return apiSuccess({ ok: true, googleEventId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.userActivitySync.update({
      where: {
        userId_activityScheduleId: { userId: user.id, activityScheduleId: id },
      },
      data: { status: 'FAILED', lastError: message },
    });
    return apiError('INTERNAL', message, 500);
  }
}

/** 同期状態を取得 */
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
  const sync = await prisma.userActivitySync.findUnique({
    where: {
      userId_activityScheduleId: { userId: user.id, activityScheduleId: id },
    },
  });
  return apiSuccess(
    sync
      ? { status: sync.status, lastError: sync.lastError }
      : { status: null, lastError: null }
  );
}
