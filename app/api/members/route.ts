import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { canViewPersonalInfo, type MemberAdmin, type MemberPublic } from '@/lib/members';

/** 参加率を計算（YES/MAYBE を参加として、活動＋提案の総数で割る） */
async function getParticipationRates(teamId: string): Promise<Map<string, number>> {
  const [activityCount, proposalCount, attendances, availabilities] = await Promise.all([
    prisma.activitySchedule.count({ where: { teamId } }),
    prisma.proposal.count({ where: { teamId } }),
    prisma.activityAttendance.findMany({
      where: { activity: { teamId } },
      select: { userId: true, answer: true },
    }),
    prisma.availability.findMany({
      where: { proposal: { teamId } },
      select: { userId: true, answer: true },
    }),
  ]);

  const total = activityCount + proposalCount;
  if (total === 0) return new Map();

  const participated = new Map<string, number>();
  const add = (userId: string) => participated.set(userId, (participated.get(userId) ?? 0) + 1);

  for (const a of attendances) {
    if (a.answer === 'YES' || a.answer === 'MAYBE') add(a.userId);
  }
  for (const a of availabilities) {
    if (a.answer === 'YES' || a.answer === 'MAYBE') add(a.userId);
  }

  const rates = new Map<string, number>();
  Array.from(participated.entries()).forEach(([userId, count]) => {
    rates.set(userId, Math.round((count / total) * 1000) / 10);
  });
  return rates;
}

export async function GET(req: NextRequest) {
  try {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;

  const members = await prisma.user.findMany({
    where: { teamId: user.teamId },
    orderBy: { displayName: 'asc' },
    include: {
      uniforms: { select: { number: true, type: true } },
    },
  });

  const isAdmin = canViewPersonalInfo(user.role);
  const [participationRates, team] = await Promise.all([
    isAdmin ? getParticipationRates(user.teamId) : Promise.resolve(new Map<string, number>()),
    prisma.team.findUnique({ where: { id: user.teamId }, select: { publicId: true } }),
  ]);
  const teamPublicId = team?.publicId ?? null;

  const result = members.map((m) => {
    const uniforms = m.uniforms.map((u) => ({ number: u.number, type: u.type }));
    if (isAdmin) {
      const item: MemberAdmin = {
        id: m.id,
        displayName: m.displayName,
        fullName: m.fullName,
        role: m.role,
        memberType: m.memberType,
        phone: m.phone,
        email: m.email,
        address: m.address,
        height: m.height,
        position: m.position,
        uniforms,
        participationRate: participationRates.get(m.id) ?? null,
      };
      return item;
    }
    const item: MemberPublic = {
      id: m.id,
      displayName: m.displayName,
      fullName: m.fullName,
      role: m.role,
      memberType: m.memberType,
      height: m.height,
      position: m.position,
      uniforms,
    };
    return item;
  });

  const isOwner = user.role === 'OWNER';
  return apiSuccess({
    members: result,
    isAdmin,
    isOwner,
    currentUserId: user.id,
    teamPublicId,
  });
  } catch (e) {
    console.error('[GET /api/members]', e);
    return apiError(
      'INTERNAL',
      e instanceof Error ? e.message : 'メンバー一覧の取得に失敗しました。DBマイグレーション（npm run db:push）を実行してください。',
      500
    );
  }
}
