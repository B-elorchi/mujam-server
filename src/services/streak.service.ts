import prisma from '../config/database';

function getUTCDateOnly(date: Date): string {
  return date.toISOString().split('T')[0]; // "2026-03-14"
}

export async function updateStreak(userId: string): Promise<void> {
  const today = getUTCDateOnly(new Date());

  const streak = await prisma.userStreak.findUnique({ where: { userId } });

  if (!streak) {
    // First time ever studying
    await prisma.userStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: new Date(today),
        totalStudyDays: 1,
      },
    });
    return;
  }

  const lastDate = streak.lastStudyDate ? getUTCDateOnly(streak.lastStudyDate) : null;

  // Already studied today — no change
  if (lastDate === today) return;

  const yesterday = getUTCDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));

  let newStreak: number;

  if (lastDate === yesterday) {
    // Studied yesterday → increment
    newStreak = streak.currentStreak + 1;
  } else {
    // Missed a day → reset
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, streak.longestStreak);

  await prisma.userStreak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastStudyDate: new Date(today),
      totalStudyDays: { increment: 1 },
    },
  });
}

export async function getStreakData(userId: string) {
  const streak = await prisma.userStreak.findUnique({ where: { userId } });

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalStudyDays: 0,
      lastStudyDate: null,
      studiedToday: false,
      freezesLeft: 0,
      weekView: [],
      streakAtRisk: false,
    };
  }

  const today = getUTCDateOnly(new Date());
  const lastDate = streak.lastStudyDate ? getUTCDateOnly(streak.lastStudyDate) : null;
  const studiedToday = lastDate === today;

  // Generate week view (last 7 days)
  const weekView = [];
  const streakStartDate = new Date(streak.lastStudyDate!);
  streakStartDate.setDate(streakStartDate.getDate() - streak.currentStreak + 1);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = getUTCDateOnly(date);
    const isStudied = lastDate && dateStr <= lastDate && date >= streakStartDate;
    
    weekView.push({
      date: dateStr,
      dayName: date.toLocaleDateString('ar-SA', { weekday: 'long' }),
      studied: isStudied,
    });
  }

  const currentHour = new Date().getHours();
  const streakAtRisk = !studiedToday && currentHour >= 20; // After 8pm

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalStudyDays: streak.totalStudyDays,
    lastStudyDate: lastDate,
    studiedToday,
    freezesLeft: streak.freezesLeft,
    weekView,
    streakAtRisk,
  };
}

export async function useStreakFreeze(userId: string): Promise<boolean> {
  const streak = await prisma.userStreak.findUnique({ where: { userId } });

  if (!streak || streak.freezesLeft <= 0) {
    return false;
  }

  const today = getUTCDateOnly(new Date());
  const yesterday = getUTCDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const lastDate = streak.lastStudyDate ? getUTCDateOnly(streak.lastStudyDate) : null;

  // Can only use freeze if yesterday was missed
  if (lastDate !== yesterday) {
    return false;
  }

  // Apply freeze: set lastStudyDate to today (as if they studied)
  await prisma.userStreak.update({
    where: { userId },
    data: {
      lastStudyDate: new Date(today),
      freezesLeft: { decrement: 1 },
    },
  });

  return true;
}
