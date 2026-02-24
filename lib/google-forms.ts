import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { prisma } from '@/lib/db';
import { decryptRefreshToken } from '@/lib/crypto';
import { formatDateTimeRange } from '@/lib/date-utils';

async function getFormsClient(userId: string) {
  const auth = await prisma.userGoogleAuth.findUnique({
    where: { userId },
  });
  if (!auth?.refreshToken) throw new Error('リフレッシュトークンがありません。Googleで再ログインしてください。');
  const plain = await decryptRefreshToken(auth.refreshToken);
  const oauth2 = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    undefined
  );
  oauth2.setCredentials({ refresh_token: plain });
  await oauth2.getAccessToken();
  const forms = google.forms({ version: 'v1', auth: oauth2 });
  return forms;
}

export type ScheduleForForm = {
  startAt: string;
  endAt: string;
  placeName: string;
};

/**
 * 選択した日程で出欠確認用のGoogleフォームを作成する。
 * 各日程ごとにラジオボタン（出る/微妙/出ない）の質問を追加。
 */
export async function createAttendanceForm(
  userId: string,
  title: string,
  schedules: ScheduleForForm[]
): Promise<string> {
  const forms = await getFormsClient(userId);

  const createRes = await forms.forms.create({
    requestBody: {
      info: {
        title: title || '交流戦 出欠確認',
      },
    },
  });

  const formId = createRes.data.formId;
  if (!formId) throw new Error('フォームの作成に失敗しました');

  const requests = schedules.map((s, i) => {
    const questionTitle = `${formatDateTimeRange(s.startAt, s.endAt)} @ ${s.placeName}\n→ 参加可否`;
    return {
      createItem: {
        item: {
          title: questionTitle,
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: 'RADIO' as const,
                options: [
                  { value: '出る' },
                  { value: '微妙' },
                  { value: '出ない' },
                ],
                shuffle: false,
              },
            },
          },
        },
        location: { index: i },
      },
    };
  });

  if (requests.length > 0) {
    await forms.forms.batchUpdate({
      formId,
      requestBody: { requests },
    });
  }

  return `https://docs.google.com/forms/d/${formId}/viewform`;
}
