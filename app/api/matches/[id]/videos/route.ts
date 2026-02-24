import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { addVideoLinkBody } from '@/lib/zod/schemas';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const record = await prisma.matchRecord.findFirst({
    where: { id, teamId: user.teamId },
  });
  if (!record) return apiError('NOT_FOUND', 'Match record not found', 404);
  const raw = await req.json().catch(() => ({}));
  const parsed = addVideoLinkBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const link = await prisma.videoLink.create({
    data: { matchRecordId: id, youtubeUrl: parsed.data.youtubeUrl },
  });
  return apiSuccess(link, 201);
}
