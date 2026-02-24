import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { updateProfileBody } from '@/lib/zod/schemas';

/** 現在ログイン中のユーザーとチーム情報（プロフィール含む） */
export async function GET(req: NextRequest) {
  try {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const [team, profile] = await Promise.all([
    prisma.team.findUnique({
      where: { id: user.teamId },
      select: { id: true, name: true, publicId: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        teamId: true,
        displayName: true,
        role: true,
        memberType: true,
        fullName: true,
        phone: true,
        email: true,
        postalCode: true,
        address: true,
        height: true,
        position: true,
        uniforms: { select: { number: true } },
      },
    }),
  ]);
  if (!team || !profile) return apiError('NOT_FOUND', 'Team or user not found', 404);
  const uniforms = (profile.uniforms ?? []).map((u: { number: number }) => u.number);
  return apiSuccess({
    user: { ...profile, uniforms },
    team,
  });
  } catch (e) {
    console.error('[GET /api/me]', e);
    return apiError(
      'INTERNAL',
      e instanceof Error ? e.message : 'サーバーエラーが発生しました',
      500
    );
  }
}

/** 自分のプロフィールを更新（メンバー表用） */
export async function PATCH(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (user instanceof Response) return user;
  const raw = await req.json().catch(() => ({}));
  const parsed = updateProfileBody.safeParse(raw);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.message, 400);

  const { fullName, phone, postalCode, address, height, position, uniforms, memberType } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        fullName: fullName ?? undefined,
        phone: phone ?? undefined,
        postalCode: postalCode ?? undefined,
        address: address ?? undefined,
        height: height ?? undefined,
        position: position ?? undefined,
        memberType: memberType ?? undefined,
      },
    });
    if (uniforms !== undefined) {
      await tx.userUniform.deleteMany({ where: { userId: user.id } });
      const uniqueNumbers = Array.from(new Set(uniforms.filter((n) => n > 0)));
      if (uniqueNumbers.length > 0) {
        await tx.userUniform.createMany({
          data: uniqueNumbers.map((number) => ({
            userId: user.id,
            number,
            type: null,
          })),
        });
      }
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      displayName: true,
      fullName: true,
      memberType: true,
      phone: true,
      email: true,
      postalCode: true,
      address: true,
      height: true,
      position: true,
      uniforms: { select: { number: true } },
    },
  });
  return apiSuccess(updated);
}
