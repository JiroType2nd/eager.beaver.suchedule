import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';

/**
 * 外部向け: ログイン不要。OPEN の枠一覧のみ。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const team = await prisma.team.findUnique({
    where: { publicId },
    select: { id: true, name: true },
  });
  if (!team) return Response.json({ error: { code: 'NOT_FOUND', message: 'Team not found' } }, { status: 404 });
  const slots = await prisma.slot.findMany({
    where: { teamId: team.id, status: 'OPEN' },
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      placeName: true,
      placeUrl: true,
      placeReason: true,
      notes: true,
    },
  });
  return apiSuccess({ team: { id: team.id, name: team.name, publicId }, slots });
}
