import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { updateAttendanceSubmissionBody } from '@/lib/zod/schemas';

/**
 * 出欠を更新（リンクを知っていれば誰でも編集可能）
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; submissionId: string }> }
) {
  const { token, submissionId } = await params;

  const link = await prisma.attendanceLink.findUnique({
    where: { token },
    include: { activities: { select: { activityScheduleId: true } } },
  });
  if (!link) return apiError('NOT_FOUND', 'リンクが見つかりません', 404);

  const submission = await prisma.attendanceSubmission.findFirst({
    where: { id: submissionId, attendanceLinkId: link.id },
  });
  if (!submission) return apiError('NOT_FOUND', '回答が見つかりません', 404);

  const raw = await req.json().catch(() => ({}));
  const parsed = updateAttendanceSubmissionBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const validActivityIds = new Set(link.activities.map((a) => a.activityScheduleId));

  if (parsed.data.nickname !== undefined) {
    await prisma.attendanceSubmission.update({
      where: { id: submissionId },
      data: { nickname: parsed.data.nickname.trim(), updatedAt: new Date() },
    });
  }

  if (parsed.data.items && parsed.data.items.length > 0) {
    for (const item of parsed.data.items) {
      if (!validActivityIds.has(item.activityScheduleId)) continue;
      await prisma.attendanceSubmissionItem.upsert({
        where: {
          submissionId_activityScheduleId: { submissionId, activityScheduleId: item.activityScheduleId },
        },
        create: {
          submissionId,
          activityScheduleId: item.activityScheduleId,
          answer: item.answer,
        },
        update: { answer: item.answer },
      });
    }
  }

  return apiSuccess({ ok: true });
}
