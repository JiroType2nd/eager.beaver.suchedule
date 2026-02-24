import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSessionUser, requireOwner } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { updateMemberRoleBody, updateMemberTypeBody } from '@/lib/zod/schemas';

/**
 * メンバーの権限または役割を変更（権限: オーナーのみ / 役割: オーナー・大会担当）
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSessionUser(req);
    if (user instanceof Response) return user;

    const forbidden = requireOwner(user);
    if (forbidden) return forbidden;

    const { id: memberId } = await params;
    const raw = await req.json().catch(() => ({}));

    // 同一チームのメンバーか確認
    const target = await prisma.user.findFirst({
      where: { id: memberId, teamId: user.teamId },
    });
    if (!target) {
      return apiError('NOT_FOUND', 'メンバーが見つかりません', 404);
    }

    const updateData: { role?: string; memberType?: string } = {};

    const roleParsed = updateMemberRoleBody.safeParse(raw);
    if (roleParsed.success) {
      if (target.id === user.id) {
        return apiError(
          'BAD_REQUEST',
          '自分の権限は変更できません。別のオーナーに変更してもらってください。',
          400
        );
      }
      const forbidden = requireOwner(user);
      if (forbidden) return forbidden;
      updateData.role = roleParsed.data.role;
    }

    const memberTypeParsed = updateMemberTypeBody.safeParse(raw);
    if (memberTypeParsed.success) {
      const canEdit = user.role === 'OWNER' || user.role === 'STAFF';
      if (!canEdit) {
        return apiError('FORBIDDEN', '役割の変更はオーナー・大会担当のみ可能です', 403);
      }
      updateData.memberType = memberTypeParsed.data.memberType;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('BAD_REQUEST', 'role または memberType を指定してください', 400);
    }

    await prisma.user.update({
      where: { id: memberId },
      data: updateData,
    });

    return apiSuccess(updateData);
  } catch (e) {
    console.error('[PATCH /api/members/[id]]', e);
    return apiError(
      'INTERNAL',
      e instanceof Error ? e.message : '権限の変更に失敗しました',
      500
    );
  }
}
