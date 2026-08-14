import { Request, Response } from 'express';
import type { PlacementQuestion } from '@prisma/client';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

/** Fisher–Yates shuffle — new order on every request so users don’t all see the same sequence */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const QUESTIONS_PER_LEVEL = 2;
const PLACEMENT_LEVELS = 7;

/** Normalize Arabic text for answer comparison */
const normalizeAr = (s: string): string =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFKC');

export const placementController = {
  getQuestions: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const picked: PlacementQuestion[] = [];

      for (let level = 1; level <= PLACEMENT_LEVELS; level++) {
        const pool = await prisma.placementQuestion.findMany({
          where: { targetLevel: level, isActive: true },
        });
        if (pool.length === 0) continue;
        const shuffled = shuffleArray(pool);
        const n = Math.min(QUESTIONS_PER_LEVEL, shuffled.length);
        picked.push(...shuffled.slice(0, n));
      }

      const shuffledQuestions = shuffleArray(picked).map((q) => ({
        id: q.id,
        sentenceEn: q.sentenceEn,
        options: shuffleArray(q.options as string[]),
        // DO NOT include: correctAr, targetLevel
      }));

      return successResponse(res, {
        questions: shuffledQuestions,
        totalQuestions: shuffledQuestions.length,
        timeLimit: null,
      });
    } catch (error) {
      console.error('Get questions error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  submitTest: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { answers } = req.body;

      // Check if user already took the test or has currentLevel > 0
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      if (user.currentLevel > 0) {
        return errorResponse(res, 'لقد أكملت اختبار تحديد المستوى بالفعل', 400);
      }

      const existingTest = await prisma.placementTest.findFirst({
        where: { userId: req.userId },
      });

      if (existingTest) {
        return errorResponse(res, 'لقد أكملت اختبار تحديد المستوى بالفعل', 400);
      }

      // Get all questions with correct answers
      const questionIds = answers.map((a: any) => a.questionId);
      const questions = await prisma.placementQuestion.findMany({
        where: { id: { in: questionIds } },
      });

      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // Score per level
      const levelScores: Record<number, { correct: number; total: number }> = {};
      for (let i = 1; i <= 7; i++) {
        levelScores[i] = { correct: 0, total: 0 };
      }

      let totalCorrect = 0;
      const gradedAnswers = [];

      for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) continue;

        const isCorrect =
          normalizeAr(String(answer.selectedOption ?? '')) === normalizeAr(question.correctAr);
        if (isCorrect) {
          totalCorrect++;
          levelScores[question.targetLevel].correct++;
        }
        levelScores[question.targetLevel].total++;
        gradedAnswers.push({ questionId: question.id, isCorrect });
      }

      // Determine highest level where student got >= 50% correct
      let assignedLevel = 1;
      for (let level = 7; level >= 1; level--) {
        const levelData = levelScores[level];
        if (levelData.total > 0 && levelData.correct >= levelData.total * 0.5) {
          assignedLevel = level;
          break;
        }
      }

      const scorePercent = Math.round((totalCorrect / answers.length) * 100);

      // Save test result
      await prisma.placementTest.create({
        data: {
          userId: req.userId!,
          score: scorePercent,
          assignedLevel,
          answers: gradedAnswers,
        },
      });

      // Keep assessed level in PlacementTest, but always start learning from level 1
      const startLevel = 1;
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          currentLevel: startLevel,
          placementScore: scorePercent,
        },
      });

      return successResponse(res, {
        score: scorePercent,
        assignedLevel,
        startLevel,
        correctAnswers: totalCorrect,
        totalQuestions: answers.length,
        message: `رائع! مستواك هو المستوى ${assignedLevel}. ستبدأ رحلتك من المستوى ${startLevel}`,
      });
    } catch (error) {
      console.error('Submit test error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getResult: async (req: Request, res: Response): Promise<Response> => {
    try {
      const test = await prisma.placementTest.findFirst({
        where: { userId: req.userId },
        orderBy: { takenAt: 'desc' },
      });

      if (!test) {
        return successResponse(res, { hasTakenTest: false });
      }

      return successResponse(res, {
        hasTakenTest: true,
        score: test.score,
        assignedLevel: test.assignedLevel,
        takenAt: test.takenAt,
      });
    } catch (error) {
      console.error('Get result error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};