import prisma from '../config/database';

/** Inactivity longer than this starts a new session (ms). */
export const SESSION_GAP_MS = 30 * 60 * 1000;

export function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfUtcDay(daysAgo = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

export function sessionDurationMinutes(startedAt: Date, lastSeenAt: Date): number {
  const ms = Math.max(0, lastSeenAt.getTime() - startedAt.getTime());
  return ms / 60_000;
}

/** Record a successful password login. */
export async function recordLogin(userId: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.loginEvent.create({ data: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: now },
    }),
  ]);
  await touchSession(userId, now, true);
}

/**
 * Extend the current open session, or open a new one after a gap / forceStart.
 * Also refreshes User.lastActiveAt.
 */
export async function touchSession(userId: string, at = new Date(), forceNew = false) {
  const latest = await prisma.userSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { lastSeenAt: 'desc' },
  });

  const gapExceeded =
    !latest || at.getTime() - latest.lastSeenAt.getTime() > SESSION_GAP_MS;

  if (forceNew || gapExceeded) {
    if (latest && !latest.endedAt) {
      await prisma.userSession.update({
        where: { id: latest.id },
        data: { endedAt: latest.lastSeenAt },
      });
    }
    const session = await prisma.userSession.create({
      data: {
        userId,
        startedAt: at,
        lastSeenAt: at,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: at },
    });
    return session;
  }

  const [session] = await prisma.$transaction([
    prisma.userSession.update({
      where: { id: latest.id },
      data: { lastSeenAt: at },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: at },
    }),
  ]);
  return session;
}

export type EngagementAnalytics = {
  kpis: {
    loginsToday: number;
    uniqueLoginsToday: number;
    avgSessionMinutes7d: number;
    activeUsers7d: number;
    dau: number;
  };
  loginsByDay: { date: string; count: number; uniqueUsers: number }[];
  avgMinutesByDay: { date: string; avgMinutes: number }[];
  days: number;
};

export async function getEngagementAnalytics(days = 30): Promise<EngagementAnalytics> {
  const clampedDays = Math.min(Math.max(days, 7), 90);
  const rangeStart = startOfUtcDay(clampedDays - 1);
  const todayStart = startOfUtcDay(0);
  const sevenDayStart = startOfUtcDay(6);

  const [loginEvents, sessions, activeUsers7d] = await Promise.all([
    prisma.loginEvent.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { userId: true, createdAt: true },
    }),
    prisma.userSession.findMany({
      where: { startedAt: { gte: rangeStart } },
      select: { startedAt: true, lastSeenAt: true },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: sevenDayStart } },
    }),
  ]);

  const loginsByDayMap: Record<string, { count: number; users: Set<string> }> = {};
  for (let i = 0; i < clampedDays; i++) {
    const d = startOfUtcDay(clampedDays - 1 - i);
    loginsByDayMap[utcDateString(d)] = { count: 0, users: new Set() };
  }

  for (const ev of loginEvents) {
    const key = utcDateString(ev.createdAt);
    if (!loginsByDayMap[key]) continue;
    loginsByDayMap[key].count += 1;
    loginsByDayMap[key].users.add(ev.userId);
  }

  const loginsByDay = Object.entries(loginsByDayMap)
    .map(([date, v]) => ({
      date,
      count: v.count,
      uniqueUsers: v.users.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const minutesByDay: Record<string, { sum: number; n: number }> = {};
  for (let i = 0; i < clampedDays; i++) {
    const d = startOfUtcDay(clampedDays - 1 - i);
    minutesByDay[utcDateString(d)] = { sum: 0, n: 0 };
  }

  let sum7d = 0;
  let count7d = 0;

  for (const s of sessions) {
    const mins = sessionDurationMinutes(s.startedAt, s.lastSeenAt);
    // Cap absurd outliers (tab left open overnight) at 8h for averages
    const capped = Math.min(mins, 8 * 60);
    const key = utcDateString(s.startedAt);
    if (minutesByDay[key]) {
      minutesByDay[key].sum += capped;
      minutesByDay[key].n += 1;
    }
    if (s.startedAt >= sevenDayStart) {
      sum7d += capped;
      count7d += 1;
    }
  }

  const avgMinutesByDay = Object.entries(minutesByDay)
    .map(([date, v]) => ({
      date,
      avgMinutes: v.n > 0 ? Math.round((v.sum / v.n) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayKey = utcDateString(todayStart);
  const todayBucket = loginsByDayMap[todayKey] || { count: 0, users: new Set<string>() };

  // DAU: unique logins today, fallback to lastActive today
  let dau = todayBucket.users.size;
  if (dau === 0) {
    dau = await prisma.user.count({
      where: { lastActiveAt: { gte: todayStart } },
    });
  }

  return {
    kpis: {
      loginsToday: todayBucket.count,
      uniqueLoginsToday: todayBucket.users.size,
      avgSessionMinutes7d: count7d > 0 ? Math.round((sum7d / count7d) * 10) / 10 : 0,
      activeUsers7d,
      dau,
    },
    loginsByDay,
    avgMinutesByDay,
    days: clampedDays,
  };
}
