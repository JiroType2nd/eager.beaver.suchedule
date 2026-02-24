import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';

/** 外部向け: チーム名とpublicIdを取得（招待ページ用） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const team = await prisma.team.findUnique({
    where: { publicId },
    select: { name: true, publicId: true },
  });
  if (!team)
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Team not found' } }, { status: 404 });
  return apiSuccess({ name: team.name, publicId: team.publicId });
}
