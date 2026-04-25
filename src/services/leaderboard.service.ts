import prisma from '../config/database';

function getWeekPeriod(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getMonthPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

function getAllTimePeriod(): string {
  return 'all-time';
}

export async function addPoints(userId: string, points: number): Promise<void> {
  const now = new Date();
  const weekPeriod = getWeekPeriod(now);
  const monthPeriod = getMonthPeriod(now);
  const allTimePeriod = getAllTimePeriod();

  // Update weekly leaderboard entry
  await prisma.leaderboardEntry.upsert({
    where: { userId_period: { userId, period: weekPeriod } },
    update: { points: { increment: points } },
    create: { userId, period: weekPeriod, points },
  });

  // Update monthly leaderboard entry
  await prisma.leaderboardEntry.upsert({
    where: { userId_period: { userId, period: monthPeriod } },
    update: { points: { increment: points } },
    create: { userId, period: monthPeriod, points },
  });

  // Update all-time leaderboard entry
  await prisma.leaderboardEntry.upsert({
    where: { userId_period: { userId, period: allTimePeriod } },
    update: { points: { increment: points } },
    create: { userId, period: allTimePeriod, points },
  });
}

/**
 * Single source of truth: LeaderboardEntry rows (updated by gamification addPoints),
 * merged with all active students so users without a row show 0 points and correct rank.
 */
export async function getLeaderboardForPeriod(period: 'weekly' | 'monthly' | 'all-time') {
  const periodStr =
    period === 'weekly'
      ? getWeekPeriod(new Date())
      : period === 'monthly'
        ? getMonthPeriod(new Date())
        : getAllTimePeriod();

  const [students, periodEntries] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: 'STUDENT' },
      select: { id: true, name: true, avatarUrl: true, currentLevel: true },
    }),
    prisma.leaderboardEntry.findMany({
      where: { period: periodStr },
      select: { userId: true, points: true },
    }),
  ]);

  const pointsByUser = new Map(periodEntries.map((e) => [e.userId, e.points]));

  const rows = students.map((u) => ({
    userId: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    currentLevel: u.currentLevel,
    points: pointsByUser.get(u.id) ?? 0,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name, 'ar', { sensitivity: 'base' });
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    ...row,
  }));
}

/** @deprecated Prefer getLeaderboardForPeriod + API controller; kept for older callers */
export async function getLeaderboard(period: 'weekly' | 'monthly' | 'all-time', userId: string) {
  const full = await getLeaderboardForPeriod(period);
  const top50 = full.slice(0, 50);
  const me = full.find((e) => e.userId === userId);

  return {
    period,
    updatedAt: new Date().toISOString(),
    currentUserRank: me?.rank ?? null,
    currentUserPoints: me?.points ?? 0,
    entries: top50.map((entry) => ({
      ...entry,
      isCurrentUser: entry.userId === userId,
    })),
  };
}

// Points awarded for different activities
export const POINTS = {
  SENTENCE_COMPLETE: 5,
  GAME_PASS: 10,
  QUIZ_PASS: 15,
  LEVEL_COMPLETE: 50,
  AI_SESSION: 10,
  SHADOWING_COMPLETE: 15,
  DAILY_STREAK: 2,
  ACHIEVEMENT_EARNED: 20,
};
