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

export async function addPoints(userId: string, points: number): Promise<void> {
  const now = new Date();
  const weekPeriod = getWeekPeriod(now);
  const monthPeriod = getMonthPeriod(now);

  // Update user's total points
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
  });

  // Note: LeaderboardEntry model needs to be added to schema
  // For now, we'll calculate leaderboard on-the-fly from user points
}

export async function getLeaderboard(period: 'weekly' | 'monthly' | 'all-time', userId: string) {
  // For now, use User.points for all-time leaderboard
  // TODO: Add LeaderboardEntry model for weekly/monthly tracking
  
  const users = await prisma.user.findMany({
    where: {
      role: 'STUDENT', // Only students on leaderboard
    },
    orderBy: { points: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      points: true,
      currentLevel: true,
    },
  });

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  const currentUserRank = currentUser
    ? users.findIndex((u) => u.id === userId) + 1
    : null;

  return {
    period,
    updatedAt: new Date().toISOString(),
    currentUserRank: currentUserRank || null,
    currentUserPoints: currentUser?.points || 0,
    entries: users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      points: user.points,
      currentLevel: user.currentLevel,
      isCurrentUser: user.id === userId,
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
