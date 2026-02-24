import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

const SEED_PUBLIC_ID = process.env.SEED_TEAM_PUBLIC_ID || 'default-team';

async function main() {
  const team = await prisma.team.upsert({
    where: { publicId: SEED_PUBLIC_ID },
    update: {},
    create: {
      name: 'サンプルチーム',
      publicId: SEED_PUBLIC_ID,
    },
  });
  console.log('Team:', team.id, team.publicId);

  const ownerId = '00000000-0000-0000-0000-000000000001';
  const user = await prisma.user.upsert({
    where: { id: ownerId },
    update: {},
    create: {
      id: ownerId,
      teamId: team.id,
      displayName: 'オーナー',
      role: 'OWNER',
      memberType: 'PLAYER',
    },
  });
  console.log('User (owner):', user.id);

  // 全ユーザーをデフォルトチームに統合（私のチーム = デフォルトチーム）
  const otherUsers = await prisma.user.findMany({ where: { teamId: { not: team.id } } });
  if (otherUsers.length > 0) {
    await prisma.user.updateMany({
      where: { teamId: { not: team.id } },
      data: { teamId: team.id },
    });
    console.log(`${otherUsers.length} ユーザーをデフォルトチームに統合しました`);
  }

  // 余ったチームを削除（関連データは cascade で削除）
  const orphanTeams = await prisma.team.findMany({ where: { id: { not: team.id } } });
  for (const ot of orphanTeams) {
    await prisma.team.delete({ where: { id: ot.id } });
  }
  if (orphanTeams.length > 0) {
    console.log(`孤児チーム ${orphanTeams.length} 件を削除しました`);
  }

  // 活動日程（画像の日程より）— デフォルトチーム（私のチーム）にのみ追加
  // 年は現在年を使用（upcoming で未来の日程が表示されるよう）
  const y = new Date().getFullYear();
  await prisma.activitySchedule.deleteMany({ where: { teamId: team.id } });

  const activitiesData: Array<{
    title: string | null;
    activityType: string;
    startAt: Date;
    endAt: Date;
    placeName: string;
  }> = [
    { title: null, activityType: '練習', startAt: new Date(y, 2, 1, 17, 0), endAt: new Date(y, 2, 1, 21, 0), placeName: '信篤' },
    { title: null, activityType: '練習', startAt: new Date(y, 2, 8, 11, 0), endAt: new Date(y, 2, 8, 13, 0), placeName: '浦安中央' },
    { title: null, activityType: '練習', startAt: new Date(y, 2, 8, 19, 0), endAt: new Date(y, 2, 8, 21, 0), placeName: '信篤' },
    { title: null, activityType: '練習', startAt: new Date(y, 2, 15, 13, 0), endAt: new Date(y, 2, 15, 15, 0), placeName: '松戸市柿ノ木台公園体育館' },
    { title: null, activityType: '練習', startAt: new Date(y, 2, 28, 11, 0), endAt: new Date(y, 2, 28, 13, 0), placeName: '松戸市クリーンセンター' },
    { title: '市川市民大会', activityType: '大会', startAt: new Date(y, 3, 4, 9, 0), endAt: new Date(y, 3, 4, 17, 0), placeName: '塩浜体育館' },
    { title: '市川市民大会', activityType: '大会', startAt: new Date(y, 3, 5, 9, 0), endAt: new Date(y, 3, 5, 17, 0), placeName: '塩浜体育館' },
    { title: '市川市民大会', activityType: '大会', startAt: new Date(y, 3, 11, 9, 0), endAt: new Date(y, 3, 11, 17, 0), placeName: '塩浜体育館' },
    { title: '市川市民大会', activityType: '大会', startAt: new Date(y, 3, 12, 9, 0), endAt: new Date(y, 3, 12, 17, 0), placeName: '塩浜体育館' },
    { title: null, activityType: '練習', startAt: new Date(y, 3, 12, 13, 0), endAt: new Date(y, 3, 12, 15, 0), placeName: '浦安中央' },
    { title: null, activityType: '練習', startAt: new Date(y, 3, 26, 11, 0), endAt: new Date(y, 3, 26, 13, 0), placeName: '浦安中央' },
    { title: null, activityType: '練習', startAt: new Date(y, 3, 26, 13, 0), endAt: new Date(y, 3, 26, 15, 0), placeName: '浦安中央' },
    { title: null, activityType: '練習', startAt: new Date(y, 4, 17, 11, 0), endAt: new Date(y, 4, 17, 13, 0), placeName: '浦安中央' },
    { title: '浦安市民大会', activityType: '大会', startAt: new Date(y, 4, 23, 9, 0), endAt: new Date(y, 4, 23, 17, 0), placeName: '浦安市民大会' },
    { title: null, activityType: '練習', startAt: new Date(y, 4, 24, 11, 0), endAt: new Date(y, 4, 24, 13, 0), placeName: '浦安中央' },
    { title: null, activityType: '練習', startAt: new Date(y, 4, 31, 13, 0), endAt: new Date(y, 4, 31, 15, 0), placeName: '浦安中央' },
    { title: '浦安市民大会', activityType: '大会', startAt: new Date(y, 4, 31, 9, 0), endAt: new Date(y, 4, 31, 17, 0), placeName: '浦安市民大会' },
    { title: '浦安市民大会', activityType: '大会', startAt: new Date(y, 5, 6, 9, 0), endAt: new Date(y, 5, 6, 17, 0), placeName: '浦安市民大会' },
    { title: '浦安市民大会', activityType: '大会', startAt: new Date(y, 5, 7, 9, 0), endAt: new Date(y, 5, 7, 17, 0), placeName: '浦安市民大会' },
  ];

  await prisma.activitySchedule.createMany({
    data: activitiesData.map((a) => ({
      teamId: team.id,
      createdByUserId: user.id,
      title: a.title,
      activityType: a.activityType,
      startAt: a.startAt,
      endAt: a.endAt,
      placeName: a.placeName,
    })),
  });
  console.log(`活動日程を ${activitiesData.length} 件、デフォルトチームに追加しました`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
