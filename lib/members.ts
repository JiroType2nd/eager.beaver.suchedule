/**
 * メンバー表 定義
 *
 * オーナー・大会担当のみ表示: 電話番号・メールアドレス・住所
 * メンバーも表示: フルネーム・身長・ポジション・ユニフォーム番号・権限
 */

/** 権限（DB値） */
export const ROLES = ['OWNER', 'STAFF', 'MEMBER'] as const;
export type Role = (typeof ROLES)[number];

/** 権限ラベル（表示用） */
export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'オーナー',
  STAFF: '大会担当',
  MEMBER: 'メンバー',
};

/** 権限変更用の選択肢 */
export const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

/** 役割（DB値：プレイヤー/マネージャー） */
export const MEMBER_TYPES = ['PLAYER', 'MANAGER'] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

/** 役割ラベル（表示用） */
export const MEMBER_TYPE_LABELS: Record<string, string> = {
  PLAYER: 'プレイヤー',
  MANAGER: 'マネージャー',
};

/** 役割変更用の選択肢 */
export const MEMBER_TYPE_OPTIONS = MEMBER_TYPES.map((t) => ({ value: t, label: MEMBER_TYPE_LABELS[t] }));

export function getMemberTypeLabel(type: string): string {
  return MEMBER_TYPE_LABELS[type] ?? type;
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** 個人情報閲覧可能か（オーナー・大会担当のみ） */
export function canViewPersonalInfo(role: string): boolean {
  return role === 'OWNER' || role === 'STAFF';
}

/** バスケットボールのポジション */
export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
export type Position = (typeof POSITIONS)[number];

/** ユニフォーム種別 */
export const UNIFORM_TYPES = ['HOME', 'AWAY'] as const;
export type UniformType = (typeof UNIFORM_TYPES)[number];

/** API から返すメンバー情報（管理者用：全フィールド + 参加率） */
export type MemberAdmin = {
  id: string;
  displayName: string;
  fullName: string | null;
  role: string;
  memberType: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  height: number | null;
  position: string | null;
  uniforms: { number: number; type: string | null }[];
  /** 参加率（%）。活動＋提案への YES/MAYBE 回答数 ÷ 総機会数。管理者のみ表示 */
  participationRate: number | null;
};

/** API から返すメンバー情報（一般メンバー用：個人情報を除外、権限は表示用に含む） */
export type MemberPublic = {
  id: string;
  displayName: string;
  fullName: string | null;
  role: string;
  memberType: string;
  height: number | null;
  position: string | null;
  uniforms: { number: number; type: string | null }[];
};

/** 表示用フルネーム（fullName 未設定時は displayName） */
export function getDisplayFullName(member: { fullName: string | null; displayName: string }): string {
  return member.fullName?.trim() || member.displayName;
}
