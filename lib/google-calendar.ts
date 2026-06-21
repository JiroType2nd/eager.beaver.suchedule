import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { prisma } from '@/lib/db';
import { decryptRefreshToken } from '@/lib/crypto';

const CALENDAR_SUMMARY = 'バスケ';

async function getCalendarClient(userId: string) {
  const auth = await prisma.userGoogleAuth.findUnique({
    where: { userId },
  });
  if (!auth?.refreshToken) throw new Error('No refresh token');
  const plain = await decryptRefreshToken(auth.refreshToken);
  const oauth2 = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2.setCredentials({ refresh_token: plain });
  await oauth2.getAccessToken();
  const calendar = google.calendar({ version: 'v3', auth: oauth2 });
  let calendarId = auth.calendarId;
  if (!calendarId) {
    const list = await calendar.calendarList.list();
    const existing = list.data.items?.find(
      (c) => c.summary === CALENDAR_SUMMARY
    );
    if (existing?.id) {
      calendarId = existing.id;
      await prisma.userGoogleAuth.update({
        where: { userId },
        data: { calendarId: existing.id, calendarSummary: existing.summary ?? undefined },
      });
    } else {
      const created = await calendar.calendars.insert({
        requestBody: { summary: CALENDAR_SUMMARY, timeZone: 'Asia/Tokyo' },
      });
      calendarId = created.data.id!;
      await prisma.userGoogleAuth.update({
        where: { userId },
        data: { calendarId, calendarSummary: CALENDAR_SUMMARY },
      });
    }
  }
  return { calendar, calendarId };
}

export type EventPayload = {
  title: string;
  startAt: Date;
  endAt: Date;
  placeName?: string;
  placeUrl?: string;
  notes?: string;
};

export type UpsertResult = {
  googleEventId: string;
  skipped: boolean;
};

export async function upsertCalendarEvent(
  userId: string,
  googleEventId: string | null,
  payload: EventPayload
): Promise<UpsertResult> {
  const { calendar, calendarId } = await getCalendarClient(userId);
  const start = payload.startAt.toISOString();
  const end = payload.endAt.toISOString();
  const body: { summary: string; start: { dateTime: string }; end: { dateTime: string }; description?: string } = {
    summary: payload.title,
    start: { dateTime: start },
    end: { dateTime: end },
  };
  if (payload.placeName || payload.placeUrl || payload.notes) {
    const parts = [];
    if (payload.placeName) parts.push(`場所: ${payload.placeName}`);
    if (payload.placeUrl) parts.push(payload.placeUrl);
    if (payload.notes) parts.push(payload.notes);
    body.description = parts.join('\n');
  }
  if (googleEventId) {
    try {
      const res = await calendar.events.update({
        calendarId: calendarId!,
        eventId: googleEventId,
        requestBody: body,
      });
      return { googleEventId: res.data.id!, skipped: false };
    } catch (e: unknown) {
      const status = (e as { code?: number })?.code;
      if (status !== 404 && status !== 410) throw e;
      // Event was deleted from Google Calendar — fall through to duplicate check + insert
    }
  }

  const existing = await calendar.events.list({
    calendarId: calendarId!,
    timeMin: start,
    timeMax: end,
    q: payload.title,
    singleEvents: true,
    maxResults: 10,
  });
  const duplicate = existing.data.items?.find(
    (ev) => ev.summary === payload.title && ev.start?.dateTime === start
  );
  if (duplicate?.id) {
    return { googleEventId: duplicate.id, skipped: true };
  }

  const res = await calendar.events.insert({
    calendarId: calendarId!,
    requestBody: body,
  });
  return { googleEventId: res.data.id!, skipped: false };
}

export async function deleteCalendarEvent(userId: string, googleEventId: string): Promise<void> {
  const { calendar, calendarId } = await getCalendarClient(userId);
  await calendar.events.delete({
    calendarId: calendarId!,
    eventId: googleEventId,
  });
}
