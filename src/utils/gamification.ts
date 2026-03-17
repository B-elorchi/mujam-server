import { updateStreak } from '../services/streak.service';
import { addPoints, POINTS } from '../services/leaderboard.service';
import { checkAndGrantAchievements } from '../services/achievement.service';
import { notify } from '../services/notification.service';
import prisma from '../config/database';

/**
 * Call this after ANY learning activity to update streak and award points
 */
export async function trackLearningActivity(
  userId: string,
  activityType: 'sentence' | 'game' | 'quiz' | 'level' | 'ai_session' | 'shadowing',
  metadata?: { levelId?: number; levelTitle?: string }
): Promise<void> {
  try {
    // Update daily streak
    await updateStreak(userId);

    // Award points based on activity type
    const pointsMap = {
      sentence: POINTS.SENTENCE_COMPLETE,
      game: POINTS.GAME_PASS,
      quiz: POINTS.QUIZ_PASS,
      level: POINTS.LEVEL_COMPLETE,
      ai_session: POINTS.AI_SESSION,
      shadowing: POINTS.SHADOWING_COMPLETE,
    };

    await addPoints(userId, pointsMap[activityType]);

    // Check for achievements based on activity type
    await checkActivityAchievements(userId, activityType, metadata);

    // Check streak achievements
    const streak = await prisma.userStreak.findUnique({ where: { userId } });
    if (streak) {
      await checkAndGrantAchievements(userId, 'streak', streak.currentStreak);
    }
  } catch (error) {
    console.error('Error tracking learning activity:', error);
    // Don't throw - gamification should not break the main flow
  }
}

/**
 * Check and grant achievements based on activity type
 */
async function checkActivityAchievements(
  userId: string,
  activityType: string,
  metadata?: { levelId?: number; levelTitle?: string }
): Promise<void> {
  switch (activityType) {
    case 'sentence':
      const totalSentences = await prisma.userSentenceProgress.count({
        where: { userId, completed: true },
      });
      await checkAndGrantAchievements(userId, 'sentences', totalSentences);
      break;

    case 'level':
      if (metadata?.levelId) {
        await checkAndGrantAchievements(userId, 'level_complete', metadata.levelId);
        
        // Send level completion notification
        if (metadata.levelTitle) {
          await notify.levelComplete(userId, metadata.levelTitle);
        }
      }
      break;

    case 'ai_session':
      const totalSessions = await prisma.aISession.count({ where: { userId } });
      await checkAndGrantAchievements(userId, 'ai_sessions', totalSessions);
      break;

    case 'shadowing':
      const totalShadowing = await prisma.userShadowingProgress.count({
        where: { userId, completed: true },
      });
      await checkAndGrantAchievements(userId, 'shadowing_complete', totalShadowing);
      break;
  }
}

/**
 * Award daily streak bonus points
 */
export async function awardStreakBonus(userId: string): Promise<void> {
  try {
    await addPoints(userId, POINTS.DAILY_STREAK);
  } catch (error) {
    console.error('Error awarding streak bonus:', error);
  }
}

/**
 * Award achievement unlock points
 */
export async function awardAchievementPoints(userId: string): Promise<void> {
  try {
    await addPoints(userId, POINTS.ACHIEVEMENT_EARNED);
  } catch (error) {
    console.error('Error awarding achievement points:', error);
  }
}
