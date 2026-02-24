import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createAttendanceForm } from '@/lib/google-forms';
import { createAttendanceFormBody } from '@/lib/zod/schemas';

/** 選択した活動日程で出欠確認用のGoogleフォームを作成 */
export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;

  const raw = await req.json().catch(() => ({}));
  const parsed = createAttendanceFormBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const { activityIds, title } = parsed.data;

  const activities = await prisma.activitySchedule.findMany({
    where: {
      id: { in: activityIds },
      teamId: user.teamId,
    },
    select: { startAt: true, endAt: true, placeName: true },
  });

  if (activities.length !== activityIds.length) {
    return apiError('BAD_REQUEST', '一部の日程が見つかりません', 400);
  }

  try {
    const schedules = activities.map((a) => ({
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      placeName: a.placeName,
    }));
    const formUrl = await createAttendanceForm(user.id, title ?? '交流戦 出欠確認', schedules);
    return apiSuccess({ formUrl });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : '';
    const isInsufficientPermission =
      errMsg.includes('Insufficient Permission') || errMsg.includes('insufficient');
    const message = isInsufficientPermission
      ? 'フォーム作成に必要な権限がありません。一度ログアウトしてから、Googleで再ログインしてください。'
      : errMsg || 'フォームの作成に失敗しました';
    return apiError('INTERNAL', message, 500);
  }
}
