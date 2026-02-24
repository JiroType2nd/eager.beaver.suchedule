/**
 * Cloud Tasks に同期タスクを enqueue する。
 * GCP では Cloud Tasks Client で POST する。ローカルはスタブ（ログのみ）。
 */

export type SyncCalendarPayload = {
  eventId: string;
  userId: string;
  action: 'UPSERT' | 'DELETE';
};

export async function enqueueSyncCalendar(payload: SyncCalendarPayload): Promise<void> {
  const url = process.env.CLOUD_TASKS_SYNC_CALENDAR_URL || '';
  if (!url) {
    console.warn('[tasks] CLOUD_TASKS_SYNC_CALENDAR_URL not set, skipping enqueue', payload);
    return;
  }
  // Cloud Tasks から呼ばれるため、OIDC トークン付きで POST するか、
  // ここでは App 内から fetch で worker URL を叩く簡易実装も可。
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Tasks enqueue failed: ${res.status}`);
  } catch (e) {
    console.error('[tasks] enqueueSyncCalendar failed', e);
    throw e;
  }
}

/**
 * 全メンバー分の同期タスクを enqueue（確定時・更新時・中止時）
 */
export async function enqueueSyncForAllMembers(
  eventId: string,
  userIds: string[],
  action: 'UPSERT' | 'DELETE'
): Promise<void> {
  for (const userId of userIds) {
    await enqueueSyncCalendar({ eventId, userId, action });
  }
}
