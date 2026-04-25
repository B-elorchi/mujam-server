import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { uploadFile } from '../config/s3';

export const adminContentController = {
  createSentence: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { levelId, textEn, textAr, orderIndex } = req.body;

      const sentence = await prisma.sentence.create({
        data: {
          levelId: parseInt(levelId),
          textEn,
          textAr,
          orderIndex: parseInt(orderIndex) || 0,
        },
      });

      return successResponse(res, sentence, 'Sentence created');
    } catch (error) {
      console.error('Create sentence error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateSentence: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { textEn, textAr, orderIndex, isActive } = req.body;

      const sentence = await prisma.sentence.update({
        where: { id },
        data: {
          ...(textEn && { textEn }),
          ...(textAr && { textAr }),
          ...(orderIndex && { orderIndex: parseInt(orderIndex) }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return successResponse(res, sentence, 'Sentence updated');
    } catch (error) {
      console.error('Update sentence error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  deleteSentence: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      await prisma.sentence.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'Sentence deleted');
    } catch (error) {
      console.error('Delete sentence error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  uploadSentenceAudio: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      if (!req.file) {
        return errorResponse(res, 'No audio file uploaded', 400);
      }

      const { url } = await uploadFile(req.file.buffer, 'sentences', req.file.mimetype);

      const sentence = await prisma.sentence.update({
        where: { id },
        data: { audioUrlNormal: url },
      });

      return successResponse(res, sentence, 'Audio uploaded');
    } catch (error) {
      console.error('Upload audio error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createGame: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { levelId, type, titleAr, orderIndex, questions } = req.body;

      const game = await prisma.game.create({
        data: {
          levelId: parseInt(levelId),
          type,
          titleAr,
          orderIndex: parseInt(orderIndex) || 0,
          questions: {
            create: questions.map((q: any, idx: number) => ({
              questionData: q.questionData,
              correctAnswer: q.correctAnswer,
              orderIndex: idx,
              sentenceId: q.sentenceId || null,
            })),
          },
        },
        include: { questions: true },
      });

      return successResponse(res, game, 'Game created');
    } catch (error) {
      console.error('Create game error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateGame: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { titleAr, orderIndex, isActive } = req.body;

      const game = await prisma.game.update({
        where: { id },
        data: {
          ...(titleAr && { titleAr }),
          ...(orderIndex && { orderIndex: parseInt(orderIndex) }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return successResponse(res, game, 'Game updated');
    } catch (error) {
      console.error('Update game error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  addGameQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { questionData, correctAnswer, sentenceId } = req.body;

      const count = await prisma.gameQuestion.count({ where: { gameId: id } });

      const question = await prisma.gameQuestion.create({
        data: {
          gameId: id,
          questionData,
          correctAnswer,
          sentenceId: sentenceId || null,
          orderIndex: count,
        },
      });

      return successResponse(res, question, 'Question added');
    } catch (error) {
      console.error('Add question error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  deleteGameQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { qId } = req.params as { qId: string };

      await prisma.gameQuestion.delete({ where: { id: qId } });

      return successResponse(res, null, 'Question deleted');
    } catch (error) {
      console.error('Delete question error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateQuiz: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { passScore, maxAttempts, timeLimit, questions } = req.body;

      if (questions) {
        await prisma.quizQuestion.deleteMany({ where: { quizId: id } });
        await prisma.quizQuestion.createMany({
          data: questions.map((q: any, idx: number) => ({
            quizId: id,
            questionData: q.questionData,
            correctAnswer: q.correctAnswer,
            type: q.type,
            points: q.points || 10,
            orderIndex: idx,
            sentenceId: q.sentenceId || null,
          })),
        });
      }

      const quiz = await prisma.levelQuiz.update({
        where: { id },
        data: {
          ...(passScore && { passScore: parseInt(passScore) }),
          ...(maxAttempts && { maxAttempts: parseInt(maxAttempts) }),
          ...(timeLimit && { timeLimit: parseInt(timeLimit) }),
        },
      });

      return successResponse(res, quiz, 'Quiz updated');
    } catch (error) {
      console.error('Update quiz error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { levelId, titleAr, titleEn, fullText, orderIndex } = req.body;

      let audioUrl = null;
      if (req.file) {
        const { url } = await uploadFile(req.file.buffer, 'stories', req.file.mimetype);
        audioUrl = url;
      }

      const story = await prisma.story.create({
        data: {
          levelId: parseInt(levelId),
          titleAr,
          titleEn,
          fullText,
          orderIndex: parseInt(orderIndex) || 0,
          audioUrl,
        },
      });

      return successResponse(res, story, 'Story created');
    } catch (error) {
      console.error('Create story error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { titleAr, titleEn, fullText, orderIndex, isActive } = req.body;

      const story = await prisma.story.update({
        where: { id },
        data: {
          ...(titleAr && { titleAr }),
          ...(titleEn && { titleEn }),
          ...(fullText && { fullText }),
          ...(orderIndex && { orderIndex: parseInt(orderIndex) }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return successResponse(res, story, 'Story updated');
    } catch (error) {
      console.error('Update story error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  listBlogPosts: async (req: Request, res: Response): Promise<Response> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          orderBy: { updatedAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.blogPost.count(),
      ]);

      return successResponse(res, {
        posts,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List blog posts error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createBlogPost: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { title, content, excerpt, coverColor, category, tags, metaDesc, keywords } = req.body;

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
        .replace(/^-|-$/g, '');

      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      const post = await prisma.blogPost.create({
        data: {
          title,
          slug: `${slug}-${Date.now()}`,
          content,
          excerpt,
          coverColor,
          category,
          tags: tags || [],
          status: 'DRAFT',
          authorId: req.userId!,
          readingTime,
          metaDesc,
          keywords,
        },
      });

      return successResponse(res, post, 'Blog post created');
    } catch (error) {
      console.error('Create blog post error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateBlogPost: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { title, content, excerpt, coverColor, category, tags, metaDesc, keywords } = req.body;

      let readingTime;
      if (content) {
        const wordCount = content.split(/\s+/).length;
        readingTime = Math.ceil(wordCount / 200);
      }

      const post = await prisma.blogPost.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(content && { content }),
          ...(excerpt && { excerpt }),
          ...(coverColor && { coverColor }),
          ...(category && { category }),
          ...(tags && { tags }),
          ...(readingTime && { readingTime }),
          ...(metaDesc && { metaDesc }),
          ...(keywords && { keywords }),
        },
      });

      return successResponse(res, post, 'Blog post updated');
    } catch (error) {
      console.error('Update blog post error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  publishBlogPost: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      const post = await prisma.blogPost.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      return successResponse(res, post, 'Blog post published');
    } catch (error) {
      console.error('Publish blog post error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  deleteBlogPost: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      await prisma.blogPost.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      return successResponse(res, null, 'Blog post archived');
    } catch (error) {
      console.error('Delete blog post error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};