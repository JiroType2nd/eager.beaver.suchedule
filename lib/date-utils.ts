import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/** 活動内容の表示用正規化（交流戦、調整中→交流戦（調整中）など） */
export function normalizeActivityTypeDisplay(type: string | null | undefined): string | null {
  if (!type) return null;
  if (type === '交流戦、調整中') return '交流戦（調整中）';
  if (type === '交流戦、確定') return '交流戦（確定）';
  return type;
}

/** 活動のタイトル＋活動内容を表示（タイトル/交流戦（調整中）形式、括弧を避ける） */
export function formatActivityTitleWithType(
  title: string | null,
  placeName: string,
  activityType: string | null | undefined
): string {
  const base = title || placeName;
  const typeStr = normalizeActivityTypeDisplay(activityType);
  if (!typeStr) return base;
  return `${base} / ${typeStr}`;
}

/** 日付＋時間範囲を表示（日跨ぎしない想定で終了時刻に日付なし）例: 4/12(日) 13:00～15:00 */
export function formatDateTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const datePart = format(start, 'M/d(E)', { locale: ja });
  const startTime = format(start, 'HH:mm', { locale: ja });
  const endTime = format(end, 'HH:mm', { locale: ja });
  return `${datePart} ${startTime}～${endTime}`;
}
