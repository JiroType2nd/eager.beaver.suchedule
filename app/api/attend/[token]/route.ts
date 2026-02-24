import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';

/**
 * 出欠リンクの情報を取得（ログイン不要）
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.attendanceLink.findUnique({
    where: { token },
    include: {
      team: { select: { name: true } },
      activities: {
        include: {
          activity: {
            select: { id: true, title: true, placeName: true, startAt: true, endAt: true },
          },
        },
      },
      submissions: {
        include: {
          items: {
            include: { activity: { select: { id: true } } },
          },
        },
      },
    },
  });

  if (!link) return apiError('NOT_FOUND', 'リンクが見つかりません', 404);

  const activities = link.activities.map((a) => ({
    id: a.activity.id,
    title: a.activity.title,
    placeName: a.activity.placeName,
    startAt: a.activity.startAt,
    endAt: a.activity.endAt,
  }));

  const submissions = link.submissions.map((s) => ({
    id: s.id,
    nickname: s.nickname,
    items: s.items.map((i) => ({
      activityScheduleId: i.activityScheduleId,
      answer: i.answer,
    })),
  }));

  // 各日程ごとの集計（〇/△/×の人数）
  const aggregates = activities.map((act) => {
    let yesCount = 0;
    let maybeCount = 0;
    let noCount = 0;
    for (const sub of submissions) {
      const item = sub.items.find((i) => i.activityScheduleId === act.id);
      if (item) {
        if (item.answer === 'YES') yesCount++;
        else if (item.answer === 'MAYBE') maybeCount++;
        else noCount++;
      }
    }
    return {
      activityScheduleId: act.id,
      yesCount,
      maybeCount,
      noCount,
    };
  });

  return apiSuccess({
    teamName: link.team.name,
    activities,
    submissions,
    aggregates,
  });
}
