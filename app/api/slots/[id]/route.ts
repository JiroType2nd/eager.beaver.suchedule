import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { updateSlotBody } from '@/lib/zod/schemas';

async function getSlotAndCheck(id: string, teamId: string) {
  const slot = await prisma.slot.findFirst({
    where: { id, teamId },
    include: { createdBy: { select: { id: true, displayName: true } } },
  });
  return slot;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(_req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const slot = await getSlotAndCheck(id, user.teamId);
  if (!slot) return apiError('NOT_FOUND', 'Slot not found', 404);
  return apiSuccess(slot);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const { id } = await params;
  const slot = await getSlotAndCheck(id, user.teamId);
  if (!slot) return apiError('NOT_FOUND', 'Slot not found', 404);
  const raw = await req.json().catch(() => ({}));
  const parsed = updateSlotBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const data: Record<string, unknown> = {};
  if (parsed.data.startAt != null) data.startAt = typeof parsed.data.startAt === 'string' ? new Date(parsed.data.startAt) : parsed.data.startAt;
  if (parsed.data.endAt != null) data.endAt = typeof parsed.data.endAt === 'string' ? new Date(parsed.data.endAt) : parsed.data.endAt;
  if (parsed.data.placeName != null) data.placeName = parsed.data.placeName;
  if (parsed.data.placeUrl !== undefined) data.placeUrl = parsed.data.placeUrl;
  if (parsed.data.placeReason !== undefined) data.placeReason = parsed.data.placeReason;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.status != null) data.status = parsed.data.status;
  const updated = await prisma.slot.update({
    where: { id },
    data,
    include: { createdBy: { select: { id: true, displayName: true } } },
  });
  return apiSuccess(updated);
}
