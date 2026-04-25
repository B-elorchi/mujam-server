import prisma from '../config/database';
import { createNotification } from './notification.service';

type ConditionJson = { type: string; value: number | string };

export type AchievementProgressDto = {
  current: number;
  target: number;
  percent: number;
};

type UserProgressSnapshot = {
  streak: number;
  sentences: number;
  aiSessions: number;
  shadowingComplete: number;
  levelIdsCompleted: Set<number>;
};

async function loadUserProgressSnapshot(userId: string): Promise<UserProgressSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      streak: true,
      levelCompletion: { where: { completed: true }, select: { levelId: true } },
      _count: {
        select: {
          sentenceProgress: { where: { completed: true } },
          aiSessions: true,
        },
      },
    },
  });

  if (!user) {
    return {
      streak: 0,
      sentences: 0,
      aiSessions: 0,
      shadowingComplete: 0,
      levelIdsCompleted: new Set(),
    };
  }

  const shadowingComplete = await prisma.userShadowingProgress.count({
    where: { userId, completed: true },
  });

  return {
    streak: user.streak?.currentStreak ?? 0,
    sentences: user._count.sentenceProgress,
    aiSessions: user._count.aiSessions,
    shadowingComplete,
    levelIdsCompleted: new Set(user.levelCompletion.map((l) => l.levelId)),
  };
}

function qualifiesForCondition(
  condition: ConditionJson,
  snap: UserProgressSnapshot
): boolean {
  switch (condition.type) {
    case 'streak':
      return snap.streak >= Number(condition.value);
    case 'sentences':
      return snap.sentences >= Number(condition.value);
    case 'level_complete':
      return snap.levelIdsCompleted.has(Number(condition.value));
    case 'ai_sessions':
      return snap.aiSessions >= Number(condition.value);
    case 'shadowing_complete':
      return snap.shadowingComplete >= Number(condition.value);
    default:
      return false;
  }
}

function progressForAchievement(
  condition: ConditionJson,
  snap: UserProgressSnapshot,
  earned: boolean
): AchievementProgressDto | null {
  if (earned) {
    const t =
      condition.type === 'level_complete'
        ? 1
        : Math.max(1, Number(condition.value) || 1);
    return { current: t, target: t, percent: 100 };
  }

  switch (condition.type) {
    case 'streak': {
      const target = Number(condition.value);
      return {
        current: snap.streak,
        target,
        percent: target > 0 ? Math.min(100, Math.round((snap.streak / target) * 100)) : 0,
      };
    }
    case 'sentences': {
      const target = Number(condition.value);
      return {
        current: snap.sentences,
        target,
        percent: target > 0 ? Math.min(100, Math.round((snap.sentences / target) * 100)) : 0,
      };
    }
    case 'ai_sessions': {
      const target = Number(condition.value);
      return {
        current: snap.aiSessions,
        target,
        percent: target > 0 ? Math.min(100, Math.round((snap.aiSessions / target) * 100)) : 0,
      };
    }
    case 'shadowing_complete': {
      const target = Number(condition.value);
      return {
        current: snap.shadowingComplete,
        target,
        percent: target > 0 ? Math.min(100, Math.round((snap.shadowingComplete / target) * 100)) : 0,
      };
    }
    case 'level_complete': {
      const levelId = Number(condition.value);
      const done = snap.levelIdsCompleted.has(levelId);
      return {
        current: done ? 1 : 0,
        target: 1,
        percent: done ? 100 : 0,
      };
    }
    default:
      return null;
  }
}

/** Grant any missing achievements from live user stats (call on GET /achievements so UI stays correct). */
export async function syncAllAchievementsForUser(userId: string): Promise<void> {
  const snap = await loadUserProgressSnapshot(userId);
  const [achievements, existing] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const earnedIds = new Set(existing.map((r) => r.achievementId));

  for (const achievement of achievements) {
    if (earnedIds.has(achievement.id)) continue;
    const condition = achievement.condition as ConditionJson;
    if (!qualifiesForCondition(condition, snap)) continue;

    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });
    earnedIds.add(achievement.id);

    await createNotification(userId, {
      title: `🏅 إنجاز جديد: ${achievement.nameAr}`,
      body: achievement.descAr,
      type: 'SUCCESS',
      actionUrl: '/streak',
    });
  }
}

/** Full list with earned flag + progress for UI (after sync). */
export async function getAchievementsForUser(userId: string) {
  await syncAllAchievementsForUser(userId);

  const [allAchievements, userRows, snap] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { key: 'asc' } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    loadUserProgressSnapshot(userId),
  ]);

  const earnedIds = new Set(userRows.map((r) => r.achievementId));

  return allAchievements.map((achievement) => {
    const condition = achievement.condition as ConditionJson;
    const earned = earnedIds.has(achievement.id);
    return {
      id: achievement.id,
      key: achievement.key,
      nameAr: achievement.nameAr,
      descAr: achievement.descAr,
      icon: achievement.icon,
      earned,
      progress: progressForAchievement(condition, snap, earned),
    };
  });
}

export async function checkAndGrantAchievements(
  userId: string,
  trigger: 'streak' | 'sentences' | 'level_complete' | 'ai_sessions' | 'shadowing_complete',
  value: number
): Promise<void> {
  // Get all achievements matching this trigger type
  const achievements = await prisma.achievement.findMany({
    where: {
      condition: {
        path: ['type'],
        equals: trigger,
      },
    },
  });

  for (const achievement of achievements) {
    const condition = achievement.condition as { type: string; value: number };

    const meetsGoal =
      trigger === 'level_complete' ? value === condition.value : value >= condition.value;

    if (meetsGoal) {
      // Check if already earned
      const alreadyEarned = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
      });

      if (!alreadyEarned) {
        // Grant achievement
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id },
        });

        // Send congratulations notification
        await createNotification(userId, {
          title: `🏅 إنجاز جديد: ${achievement.nameAr}`,
          body: achievement.descAr,
          type: 'SUCCESS',
          actionUrl: '/streak',
        });
      }
    }
  }
}

export async function getUserAchievements(userId: string) {
  const allAchievements = await prisma.achievement.findMany();
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });

  const earnedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.earnedAt]));

  return {
    earned: userAchievements.length,
    total: allAchievements.length,
    achievements: allAchievements.map((achievement) => ({
      key: achievement.key,
      nameAr: achievement.nameAr,
      descAr: achievement.descAr,
      icon: achievement.icon,
      earned: earnedMap.has(achievement.id),
      earnedAt: earnedMap.get(achievement.id) || null,
    })),
  };
}
