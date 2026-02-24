import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';

/**
 * 外部向け: ログイン不要。交流戦候補日程（活動内容が未定）を返す。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const team = await prisma.team.findUnique({
    where: { publicId },
    select: { id: true, name: true, publicId: true },
  });
  if (!team) return Response.json({ error: { code: 'NOT_FOUND', message: 'Team not found' } }, { status: 404 });

  const candidates = await prisma.activitySchedule.findMany({
    where: {
      teamId: team.id,
      activityType: '未定',
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      title: true,
      placeName: true,
      placeUrl: true,
      startAt: true,
      endAt: true,
    },
  });

  return apiSuccess({
    team: { id: team.id, name: team.name, publicId: team.publicId },
    candidates,
  });
}
