import prisma from '../config/database';

/**
 * Checks if a user has completed all requirements for a specific level.
 * Requirements:
 * - All sentences in the level are completed.
 * - All games in the level are completed (passed).
 * - The level quiz is passed.
 * - All shadowing stories in the level are completed (if any).
 * 
 * If all requirements are met, it marks the level as completed and 
 * unlocks/updates the user's current level.
 */
export async function checkLevelCompletion(userId: string, levelId: number) {
    try {
        const levelMeta = await prisma.level.findUnique({
            where: { id: levelId },
            select: { levelType: true },
        });
        const isGrammarLevel = levelMeta?.levelType === 'grammar';

        // 1. Check Sentences
        const totalSentences = await prisma.sentence.count({
            where: { levelId, isActive: true },
        });

        const completedSentences = await prisma.userSentenceProgress.count({
            where: {
                userId,
                sentence: { levelId },
                completed: true,
            },
        });

        if (completedSentences < totalSentences) return false;

        // 2. Check Games — optional practice games on grammar levels; do not gate completion
        if (!isGrammarLevel) {
            const totalGames = await prisma.game.count({
                where: { levelId, isActive: true },
            });

            const completedGames = await prisma.userGameProgress.count({
                where: {
                    userId,
                    game: { levelId },
                    completed: true,
                },
            });

            if (completedGames < totalGames) return false;
        }

        // 3. Check Quiz — no quiz requirement on grammar levels
        if (!isGrammarLevel) {
            const quiz = await prisma.levelQuiz.findUnique({
                where: { levelId },
            });

            if (quiz) {
                const quizPassed = await prisma.userQuizAttempt.findFirst({
                    where: {
                        userId,
                        quizId: quiz.id,
                        passed: true,
                    },
                });
                if (!quizPassed) return false;
            }
        }

        // 4. Check Shadowing (Stories)
        const totalStories = await prisma.story.count({
            where: { levelId, isActive: true },
        });

        if (totalStories > 0) {
            const completedStories = await prisma.userShadowingProgress.count({
                where: {
                    userId,
                    story: { levelId },
                    completed: true,
                },
            });
            if (completedStories < totalStories) return false;
        }

        // If we reached here, everything is completed!

        // Update Level Completion record
        await prisma.userLevelCompletion.upsert({
            where: {
                userId_levelId: { userId, levelId },
            },
            update: {
                completed: true,
                completedAt: new Date(),
            },
            create: {
                userId,
                levelId,
                completed: true,
                completedAt: new Date(),
            },
        });

        // Update User's currentLevel if they are completing their current level
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currentLevel: true },
        });

        if (user && user.currentLevel === levelId) {
            const finishedLevel = await prisma.level.findUnique({
                where: { id: levelId },
                select: { orderIndex: true },
            });

            const nextLevel = finishedLevel
                ? await prisma.level.findFirst({
                    where: {
                        orderIndex: { gt: finishedLevel.orderIndex },
                        isActive: true,
                    },
                    orderBy: { orderIndex: 'asc' },
                })
                : null;

            if (nextLevel) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { currentLevel: nextLevel.id },
                });
            }
        }

        return true;
    } catch (error) {
        console.error('Check level completion error:', error);
        return false;
    }
}
