import prisma from '../config/database';

const STREAK_TIMEZONE = process.env.STREAK_TIMEZONE || 'Asia/Riyadh';
const DAY_MS = 24 * 60 * 60 * 1000;

function getDatePartsInTimeZone(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STREAK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
}

function getDayNumberInTimeZone(date: Date): number {
  const { year, month, day } = getDatePartsInTimeZone(date);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayNumberToDateKey(dayNumber: number): string {
  return new Date(dayNumber * DAY_MS).toISOString().split('T')[0];
}

export async function updateStreak(userId: string): Promise<void> {
  const now = new Date();
  const todayDayNumber = getDayNumberInTimeZone(now);

  const streak = await prisma.userStreak.findUnique({ where: { userId } });

  if (!streak) {
    // First time ever studying
    await prisma.userStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: now,
        totalStudyDays: 1,
      },
    });
    return;
  }

  const lastDayNumber = streak.lastStudyDate ? getDayNumberInTimeZone(streak.lastStudyDate) : null;

  // Already studied today — no change
  if (lastDayNumber === todayDayNumber) return;

  let newStreak: number;

  if (lastDayNumber === todayDayNumber - 1) {
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
      lastStudyDate: now,
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

  const now = new Date();
  const todayDayNumber = getDayNumberInTimeZone(now);
  const lastDayNumber = streak.lastStudyDate ? getDayNumberInTimeZone(streak.lastStudyDate) : null;
  const studiedToday = lastDayNumber === todayDayNumber;

  // Generate week view (last 7 days)
  const weekView = [];
  const streakStartDayNumber =
    lastDayNumber !== null ? lastDayNumber - streak.currentStreak + 1 : Number.POSITIVE_INFINITY;

  for (let i = 6; i >= 0; i--) {
    const dayNumber = todayDayNumber - i;
    const dateStr = dayNumberToDateKey(dayNumber);
    const dayDate = new Date(dayNumber * DAY_MS);
    const isStudied =
      lastDayNumber !== null && dayNumber >= streakStartDayNumber && dayNumber <= lastDayNumber;

    weekView.push({
      date: dateStr,
      dayName: dayDate.toLocaleDateString('ar-SA', { weekday: 'long', timeZone: STREAK_TIMEZONE }),
      studied: isStudied,
    });
  }

  const currentHour = Number(
    new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: STREAK_TIMEZONE }).format(now)
  );
  const streakAtRisk = !studiedToday && currentHour >= 20; // After 8pm

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalStudyDays: streak.totalStudyDays,
    lastStudyDate: lastDayNumber !== null ? dayNumberToDateKey(lastDayNumber) : null,
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

  const now = new Date();
  const todayDayNumber = getDayNumberInTimeZone(now);
  const lastDayNumber = streak.lastStudyDate ? getDayNumberInTimeZone(streak.lastStudyDate) : null;

  // Can only use freeze if yesterday was missed
  if (lastDayNumber !== todayDayNumber - 1) {
    return false;
  }

  // Apply freeze: set lastStudyDate to today (as if they studied)
  await prisma.userStreak.update({
    where: { userId },
    data: {
      lastStudyDate: now,
      freezesLeft: { decrement: 1 },
    },
  });

  return true;
}
