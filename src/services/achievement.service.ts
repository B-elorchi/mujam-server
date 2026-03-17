import prisma from '../config/database';
import { createNotification } from './notification.service';

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

    if (value >= condition.value) {
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
