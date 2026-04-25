import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

export const createSentenceSchema = z.object({
  levelId: z.number().int().positive(),
  textEn: z.string().min(1).max(500),
  textAr: z.string().min(1).max(500),
  orderIndex: z.number().int().optional(),
});

export const createGameSchema = z.object({
  levelId: z.number().int().positive(),
  type: z.enum(['DRAG_DROP', 'MULTIPLE_CHOICE', 'AUDIO_MATCH', 'FILL_BLANK']),
  titleAr: z.string().min(1).max(200),
  orderIndex: z.number().int().optional(),
  questions: z.array(z.object({
    questionData: z.any(),
    correctAnswer: z.string(),
    sentenceId: z.string().optional(),
  })),
});

export const submitGameAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })),
});

export const submitQuizAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })),
});

export const submitPlacementSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })),
});

export const startAISessionSchema = z.object({
  scenarioId: z.string().optional(),
  mode: z.enum(['GUIDED', 'FREE']).optional(),
});

export const sendAIMessageSchema = z.object({
  text: z.string().optional(),
});

export const createBlogPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  coverColor: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  metaDesc: z.string().optional(),
  keywords: z.string().optional(),
});

export const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'PROMO']).optional(),
  channel: z.enum(['IN_APP', 'EMAIL', 'PUSH', 'ALL']).optional(),
  target: z.enum(['ALL', 'FREE_USERS', 'PREMIUM_USERS', 'BY_LEVEL', 'INACTIVE', 'CUSTOM']).optional(),
  targetConfig: z.any().optional(),
  actionUrl: z.string().optional(),
  icon: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export const subscriptionSchema = z.object({
  plan: z.enum(['PREMIUM']),
  paymentMethodId: z.string().optional(),
});

export const aiSettingsSchema = z.object({
  gptModel: z.string().optional(),
  sttModel: z.string().optional(),
  ttsModel: z.string().optional(),
  ttsVoice: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().optional(),
  correctionStyle: z.string().optional(),
  formalityLevel: z.number().int().min(0).max(100).optional(),
  monthlyBudgetUsd: z.number().positive().optional(),
});

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: error.issues[0].message,
          errors: error.issues,
        });
      }
      next(error);
    }
  };
};