import { prisma } from '@/lib/db';
import { encryptRefreshToken } from '@/lib/crypto';
import { nanoid } from 'nanoid';

const DEFAULT_TEAM_NAME = 'マイチーム';
const SEED_TEAM_PUBLIC_ID = process.env.SEED_TEAM_PUBLIC_ID || 'default-team';

/**
 * Google sub で User を検索。いなければ Team + User + UserGoogleAuth を作成し、User を返す。
 * デフォルトチーム（default-team）が存在する場合はそちらに参加。refresh_token は encrypted で保存。
 * メールアドレスは Google 登録アドレスで自動反映（新規作成時・既存ユーザーのログイン時）。
 */
export async function ensureUserByGoogleSub(
  googleSub: string,
  displayName: string,
  refreshToken: string | null,
  email: string | null
): Promise<{ id: string; teamId: string }> {
  const existing = await prisma.userGoogleAuth.findUnique({
    where: { googleSubject: googleSub },
    include: { user: true },
  });
  if (existing) {
    if (refreshToken) {
      const encrypted = await encryptRefreshToken(refreshToken).catch(() => null);
      if (encrypted)
        await prisma.userGoogleAuth.update({
          where: { userId: existing.userId },
          data: { refreshToken: encrypted, tokenUpdatedAt: new Date() },
        });
    }
    if (email) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { email },
      });
    }
    return { id: existing.user.id, teamId: existing.user.teamId };
  }

  // 新規: デフォルトチームがあれば参加、なければ新規作成
  const defaultTeam = await prisma.team.findUnique({
    where: { publicId: SEED_TEAM_PUBLIC_ID },
  });

  const team = defaultTeam ?? (await prisma.team.create({
    data: {
      name: DEFAULT_TEAM_NAME,
      publicId: nanoid(10),
    },
  }));
  const user = await prisma.user.create({
    data: {
      teamId: team.id,
      displayName: displayName || 'メンバー',
      role: 'OWNER',
      memberType: 'PLAYER',
      email: email ?? undefined,
    },
  });
  const encrypted = refreshToken ? await encryptRefreshToken(refreshToken).catch(() => null) : null;
  await prisma.userGoogleAuth.create({
    data: {
      userId: user.id,
      googleSubject: googleSub,
      refreshToken: encrypted ?? '', // 初回で取れない場合あり
      scope: undefined,
    },
  });
  return { id: user.id, teamId: user.teamId };
}
