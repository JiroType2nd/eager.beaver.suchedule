import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

const assetBody = z.object({
  type: z.enum(['IMAGE', 'PDF']),
  url: z.string().url(),
});

/**
 * 試合記録にアセット（画像/PDF）を登録。
 * アップロードは別途: Cloud Storage の signed URL を発行する API を用意し、
 * クライアントが PUT でアップロード後、ここで type と url を登録する。
 */
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
  const parsed = assetBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const asset = await prisma.asset.create({
    data: {
      matchRecordId: id,
      type: parsed.data.type as 'IMAGE' | 'PDF',
      url: parsed.data.url,
    },
  });
  return apiSuccess(asset, 201);
}
