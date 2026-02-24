import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { syncCalendarTaskBody } from '@/lib/zod/schemas';
import {
  upsertCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar';

/**
 * Cloud Tasks から叩かれる。OIDC 認証推奨（ここでは body の eventId/userId のみ検証）。
 * 本番では Cloud Tasks の OIDC トークンを検証すること。
 */
export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));
  const parsed = syncCalendarTaskBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);
  const { eventId, userId, action } = parsed.data;

  const sync = await prisma.userEventSync.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (!sync) return apiError('NOT_FOUND', 'UserEventSync not found', 404);

  const event = await prisma.event.findFirst({
    where: { id: eventId },
  });
  if (!event) return apiError('NOT_FOUND', 'Event not found', 404);

  try {
    if (action === 'DELETE') {
      if (sync.googleEventId) {
        await deleteCalendarEvent(userId, sync.googleEventId);
      }
      await prisma.userEventSync.update({
        where: { userId_eventId: { userId, eventId } },
        data: { status: 'SYNCED', googleEventId: null, lastError: null },
      });
      return apiSuccess({ ok: true });
    }

    // UPSERT
    const payload = {
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      placeName: event.placeName,
      placeUrl: event.placeUrl ?? undefined,
      notes: event.notes ?? undefined,
    };
    const googleEventId = await upsertCalendarEvent(
      userId,
      sync.googleEventId,
      payload
    );
    await prisma.userEventSync.update({
      where: { userId_eventId: { userId, eventId } },
      data: { status: 'SYNCED', googleEventId, lastError: null },
    });
    return apiSuccess({ googleEventId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.userEventSync.update({
      where: { userId_eventId: { userId, eventId } },
      data: { status: 'FAILED', lastError: message },
    });
    return apiError('INTERNAL', message, 500);
  }
}
