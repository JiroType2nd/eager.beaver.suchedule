import { z } from 'zod';

const timestamptz = z.string().datetime({ offset: true }).or(z.date());

// ----- Attendance Link（出欠リンク、ログイン不要） -----
export const createAttendanceLinkBody = z.object({
  activityIds: z.array(z.string().uuid()).min(1).max(20),
});
export type CreateAttendanceLinkBody = z.infer<typeof createAttendanceLinkBody>;

export const submitAttendanceBody = z.object({
  nickname: z.string().min(1).max(100),
  items: z.array(z.object({
    activityScheduleId: z.string().uuid(),
    answer: z.enum(['YES', 'MAYBE', 'NO']),
  })).min(1),
});
export type SubmitAttendanceBody = z.infer<typeof submitAttendanceBody>;

export const updateAttendanceSubmissionBody = z.object({
  nickname: z.string().min(1).max(100).optional(),
  items: z.array(z.object({
    activityScheduleId: z.string().uuid(),
    answer: z.enum(['YES', 'MAYBE', 'NO']),
  })).min(1).optional(),
});

// ----- Proposals -----
export const createExchangeProposalsBody = z.object({
  opponentName: z.string().min(1).max(200),
  dates: z.array(z.object({
    startAt: timestamptz,
    endAt: timestamptz,
    placeName: z.string().min(1).max(500),
    placeUrl: z.string().url().optional().nullable(),
  })).min(1).max(20),
});
export type CreateExchangeProposalsBody = z.infer<typeof createExchangeProposalsBody>;

export const createProposalBody = z.object({
  slotId: z.string().uuid().optional().nullable(),
  activityScheduleId: z.string().uuid().optional().nullable(),
  source: z.enum(['SELF', 'OPPONENT']),
  opponentName: z.string().min(1).max(200),
  startAt: timestamptz,
  endAt: timestamptz,
  placeName: z.string().min(1).max(500).optional().nullable(),
  placeUrl: z.string().url().optional().nullable(),
});
export type CreateProposalBody = z.infer<typeof createProposalBody>;

// ----- Members (role, memberType) -----
export const updateMemberRoleBody = z.object({
  role: z.enum(['OWNER', 'STAFF', 'MEMBER']),
});
export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBody>;

export const updateMemberTypeBody = z.object({
  memberType: z.enum(['PLAYER', 'MANAGER']),
});
export type UpdateMemberTypeBody = z.infer<typeof updateMemberTypeBody>;

export const proposalOkBody = z.object({
  side: z.enum(['OUR', 'THEIR']),
  ok: z.boolean(),
});
export type ProposalOkBody = z.infer<typeof proposalOkBody>;

// ----- Availability -----
export const putAvailabilityBody = z.object({
  answer: z.enum(['YES', 'MAYBE', 'NO']),
  lateAt: timestamptz.optional().nullable(),
  leaveAt: timestamptz.optional().nullable(),
  comment: z.string().max(1000).optional().nullable(),
});
export type PutAvailabilityBody = z.infer<typeof putAvailabilityBody>;

// ----- Events -----
export const updateEventBody = z.object({
  title: z.string().min(1).max(500).optional(),
  startAt: timestamptz.optional(),
  endAt: timestamptz.optional(),
  placeName: z.string().min(1).max(500).optional(),
  placeUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type UpdateEventBody = z.infer<typeof updateEventBody>;

// ----- Calendar Sync Task -----
export const syncCalendarTaskBody = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.enum(['UPSERT', 'DELETE']),
});
export type SyncCalendarTaskBody = z.infer<typeof syncCalendarTaskBody>;

// ----- ActivitySchedule -----
export const ACTIVITY_TYPES = ['未定', '交流戦（調整中）', '交流戦（確定）', '交流戦', '大会', '練習', 'ピックアップ', 'その他'] as const;

export const createActivityScheduleBody = z.object({
  title: z.string().max(500).optional().nullable(),
  activityType: z.enum(ACTIVITY_TYPES).optional().nullable(),
  startAt: timestamptz,
  endAt: timestamptz,
  placeName: z.string().min(1).max(500),
  placeUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateActivityScheduleBody = z.infer<typeof createActivityScheduleBody>;

export const updateActivityScheduleBody = createActivityScheduleBody.partial();
export type UpdateActivityScheduleBody = z.infer<typeof updateActivityScheduleBody>;

export const bulkUpdateActivityScheduleBody = z.object({
  activityIds: z.array(z.string().uuid()).min(1).max(100),
  placeName: z.string().min(1).max(500).optional(),
  activityType: z.enum(ACTIVITY_TYPES).optional().nullable(),
  dateShiftDays: z.number().int().optional(), // 選択日程の日付を一括でN日ずらす
});
export type BulkUpdateActivityScheduleBody = z.infer<typeof bulkUpdateActivityScheduleBody>;

export const putBulkAttendanceBody = z.object({
  items: z.array(z.object({
    activityId: z.string().uuid(),
    answer: z.enum(['YES', 'MAYBE', 'NO']),
  })).min(1).max(100),
});
export type PutBulkAttendanceBody = z.infer<typeof putBulkAttendanceBody>;

export const putActivityAttendanceBody = z.object({
  answer: z.enum(['YES', 'MAYBE', 'NO']),
  lateAt: timestamptz.optional().nullable(),
  leaveAt: timestamptz.optional().nullable(),
  comment: z.string().max(1000).optional().nullable(),
});
export type PutActivityAttendanceBody = z.infer<typeof putActivityAttendanceBody>;

// ----- MatchRecord -----
export const createMatchRecordBody = z.object({
  eventId: z.string().uuid(),
  opponentName: z.string().min(1).max(200),
  scoreUs: z.number().int().min(0).optional().nullable(),
  scoreThem: z.number().int().min(0).optional().nullable(),
  memo: z.string().max(2000).optional().nullable(),
});
export type CreateMatchRecordBody = z.infer<typeof createMatchRecordBody>;

export const addVideoLinkBody = z.object({
  youtubeUrl: z.string().url().refine((u) => u.includes('youtube.com') || u.includes('youtu.be')),
});
export type AddVideoLinkBody = z.infer<typeof addVideoLinkBody>;

// ----- プロフィール（メンバー表用） -----
// ----- GuestRecruitment -----
export const GUEST_RECRUITMENT_LEVELS = ['男女ミックス（エンジョイ）', '男性のみ（エンジョイ）', '男性のみ（しっかりめ）'] as const;

export const createGuestRecruitmentBody = z.object({
  title: z.string().max(500).optional().nullable(),
  placeName: z.string().min(1).max(500),
  placeUrl: z.string().url().optional().nullable(),
  level: z.enum(GUEST_RECRUITMENT_LEVELS),
  capacity: z.number().int().min(1).max(1000),
  feeYen: z.number().int().min(0).max(1000000),
  startAt: timestamptz,
  endAt: timestamptz,
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateGuestRecruitmentBody = z.infer<typeof createGuestRecruitmentBody>;

// ----- プロフィール（メンバー表用） -----
export const updateProfileBody = z.object({
  fullName: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  height: z.number().int().min(50).max(300).optional().nullable(),
  position: z.string().max(20).optional().nullable(),
  uniforms: z.array(z.number().int().min(0).max(999)).optional(),
  memberType: z.enum(['PLAYER', 'MANAGER']).optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

// ----- Team（オーナー用: チーム名・ロゴ） -----
export const updateTeamBody = z.object({
  name: z.string().min(1).max(200).optional(),
  logoUrl: z.string().url().max(2000).optional().nullable(),
});
export type UpdateTeamBody = z.infer<typeof updateTeamBody>;
