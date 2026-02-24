import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const record = await prisma.matchRecord.findFirst({
    where: { id, teamId: user.teamId },
    include: {
      event: true,
      createdBy: { select: { displayName: true } },
      assets: true,
      videoLinks: true,
    },
  });
  if (!record) return apiError('NOT_FOUND', 'Match record not found', 404);
  return apiSuccess(record);
}
