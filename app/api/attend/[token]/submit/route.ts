import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { submitAttendanceBody } from '@/lib/zod/schemas';

/**
 * 出欠を登録（ログイン不要）
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.attendanceLink.findUnique({
    where: { token },
    include: { activities: { select: { activityScheduleId: true } } },
  });
  if (!link) return apiError('NOT_FOUND', 'リンクが見つかりません', 404);

  const raw = await req.json().catch(() => ({}));
  const parsed = submitAttendanceBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const { nickname, items } = parsed.data;

  const validActivityIds = new Set(link.activities.map((a) => a.activityScheduleId));
  for (const item of items) {
    if (!validActivityIds.has(item.activityScheduleId)) {
      return apiError('BAD_REQUEST', '無効な日程が含まれています', 400);
    }
  }

  const submission = await prisma.attendanceSubmission.create({
    data: {
      attendanceLinkId: link.id,
      nickname: nickname.trim(),
      items: {
        create: items.map((i) => ({
          activityScheduleId: i.activityScheduleId,
          answer: i.answer,
        })),
      },
    },
  });

  return apiSuccess({ submissionId: submission.id }, 201);
}
