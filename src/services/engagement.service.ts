import prisma from '../config/database';

/** Deterministic 32-bit hash for stable daily picks. */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function todayUtcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** ISO week key e.g. 2026-W35 */
export function getIsoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getIsoWeekNumber(d = new Date()): number {
  const key = getIsoWeekKey(d);
  return parseInt(key.split('-W')[1], 10);
}

function pickIndices(seed: number, count: number, length: number): number[] {
  if (length <= 0 || count <= 0) return [];
  const n = Math.min(count, length);
  const indices: number[] = [];
  let s = seed || 1;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    let idx = s % length;
    let guard = 0;
    while (indices.includes(idx) && guard < length) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      idx = s % length;
      guard++;
    }
    indices.push(idx);
  }
  return indices;
}

export type WeeklyChallengeDef = {
  id: string;
  titleAr: string;
  promptEn: string;
  tipAr?: string;
};

/** Hardcoded MVP challenge pool — rotated by ISO week number. */
export const WEEKLY_CHALLENGES: WeeklyChallengeDef[] = [
  {
    id: 'wc-airport',
    titleAr: 'في المطار',
    promptEn: 'You are at the airport check-in desk. Ask about your gate, boarding time, and if you can take a carry-on bag.',
    tipAr: 'استخدم عبارات مهذبة مثل Excuse me و Could you tell me…',
  },
  {
    id: 'wc-cafe',
    titleAr: 'في المقهى',
    promptEn: 'Order a drink and a snack at a café. Ask about sizes, milk options, and the price.',
    tipAr: 'تدرب على I’d like… و Can I have…؟',
  },
  {
    id: 'wc-doctor',
    titleAr: 'عند الطبيب',
    promptEn: 'Describe mild symptoms to a doctor and ask what you should do next.',
    tipAr: 'ركّز على I feel… و It hurts when…',
  },
  {
    id: 'wc-hotel',
    titleAr: 'في الفندق',
    promptEn: 'Check into a hotel. Ask about the room, Wi‑Fi, breakfast hours, and checkout time.',
    tipAr: 'اسأل بأدب: Do you have…? What time is…?',
  },
  {
    id: 'wc-shopping',
    titleAr: 'التسوّق',
    promptEn: 'You are shopping for a gift. Ask about sizes, colors, and if there is a discount.',
    tipAr: 'جرّب How much is this? و Do you have this in…?',
  },
  {
    id: 'wc-directions',
    titleAr: 'طلب الاتجاهات',
    promptEn: 'Ask a stranger for directions to the nearest metro station and how long it takes to walk.',
    tipAr: 'استخدم How do I get to…? و Is it far from here?',
  },
  {
    id: 'wc-job',
    titleAr: 'مقابلة عمل قصيرة',
    promptEn: 'Introduce yourself in a short job interview: your background, strengths, and why you want the role.',
    tipAr: 'ابدأ بـ Tell me about yourself ثم أعطِ مثالاً واضحاً.',
  },
  {
    id: 'wc-restaurant',
    titleAr: 'في المطعم',
    promptEn: 'Reserve a table for tonight, ask about the menu specialties, and request the bill politely.',
    tipAr: 'تدرّب على I’d like to book… و Could we have the check, please?',
  },
];

export function getChallengeForWeek(weekNumber: number): WeeklyChallengeDef {
  const idx = ((weekNumber % WEEKLY_CHALLENGES.length) + WEEKLY_CHALLENGES.length) % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[idx];
}

export type DailyPathStepLinks = {
  sentencesHref: string;
  gameHref: string | null;
  shadowingHref: string | null;
  aiHref: string;
};

export async function getOrCreateDailyPath(userId: string) {
  const date = todayUtcDateString();
  const existing = await prisma.dailyPathProgress.findUnique({
    where: { userId_date: { userId, date } },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentLevel: true },
  });
  const levelId = Math.max(1, user?.currentLevel || 1);

  let progress = existing;
  if (!progress) {
    const seed = hashSeed(`${userId}:${date}:${levelId}`);

    const [sentences, games, stories, scenarios] = await Promise.all([
      prisma.sentence.findMany({
        where: { levelId, isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, textEn: true, textAr: true, orderIndex: true },
      }),
      prisma.game.findMany({
        where: { levelId, isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, titleAr: true, type: true },
      }),
      prisma.story.findMany({
        where: { levelId, isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, titleAr: true, titleEn: true },
      }),
      prisma.aIScenario.findMany({
        where: { levelId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, nameAr: true, descriptionAr: true, openingMessage: true },
      }),
    ]);

    const sentenceIdx = pickIndices(seed, 5, sentences.length);
    const pickedSentences = sentenceIdx.map((i) => sentences[i]);
    const game = games.length ? games[pickIndices(seed ^ 0x9e3779b9, 1, games.length)[0]] : null;
    const story = stories.length ? stories[pickIndices(seed ^ 0x85ebca6b, 1, stories.length)[0]] : null;
    const scenario = scenarios.length
      ? scenarios[pickIndices(seed ^ 0xc2b2ae35, 1, scenarios.length)[0]]
      : null;

    const fallbackPrompt =
      'Practice a short everyday conversation at your current level. Greet, ask one question, and respond politely.';

    progress = await prisma.dailyPathProgress.create({
      data: {
        userId,
        date,
        levelId,
        sentenceIds: pickedSentences.map((s) => s.id),
        gameId: game?.id ?? null,
        storyId: story?.id ?? null,
        scenarioId: scenario?.id ?? null,
        aiPromptEn: scenario?.openingMessage || fallbackPrompt,
      },
    });
  }

  const sentenceIds = (progress.sentenceIds as string[]) || [];

  const [sentenceRows, gameRow, storyRow, scenarioRow, sentenceDoneCount, gameProg, shadowProg, aiSessionToday] =
    await Promise.all([
      sentenceIds.length
        ? prisma.sentence.findMany({
            where: { id: { in: sentenceIds } },
            select: { id: true, textEn: true, textAr: true, orderIndex: true },
          })
        : Promise.resolve([]),
      progress.gameId
        ? prisma.game.findUnique({
            where: { id: progress.gameId },
            select: { id: true, titleAr: true, type: true, levelId: true },
          })
        : Promise.resolve(null),
      progress.storyId
        ? prisma.story.findUnique({
            where: { id: progress.storyId },
            select: { id: true, titleAr: true, titleEn: true, levelId: true },
          })
        : Promise.resolve(null),
      progress.scenarioId
        ? prisma.aIScenario.findUnique({
            where: { id: progress.scenarioId },
            select: { id: true, nameAr: true, descriptionAr: true },
          })
        : Promise.resolve(null),
      sentenceIds.length
        ? prisma.userSentenceProgress.count({
            where: { userId, sentenceId: { in: sentenceIds }, completed: true },
          })
        : Promise.resolve(0),
      progress.gameId
        ? prisma.userGameProgress.findUnique({
            where: { userId_gameId: { userId, gameId: progress.gameId } },
          })
        : Promise.resolve(null),
      progress.storyId
        ? prisma.userShadowingProgress.findUnique({
            where: { userId_storyId: { userId, storyId: progress.storyId } },
          })
        : Promise.resolve(null),
      prisma.aISession.findFirst({
        where: {
          userId,
          startedAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(`${date}T23:59:59.999Z`),
          },
          ...(progress.scenarioId ? { scenarioId: progress.scenarioId } : {}),
        },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

  // Keep sentence order matching stored ids
  const sentenceMap = new Map(sentenceRows.map((s) => [s.id, s]));
  const orderedSentences = sentenceIds.map((id) => sentenceMap.get(id)).filter(Boolean);

  const derivedSentencesDone =
    progress.sentencesDone ||
    (sentenceIds.length > 0 && sentenceDoneCount >= sentenceIds.length);
  const derivedGameDone = progress.gameDone || !!gameProg?.completed;
  const derivedShadowingDone =
    !progress.storyId || progress.shadowingDone || !!shadowProg?.completed;
  const derivedAiDone = progress.aiDone || !!aiSessionToday;

  // Persist derived completions so returning users see stable flags
  if (
    derivedSentencesDone !== progress.sentencesDone ||
    derivedGameDone !== progress.gameDone ||
    derivedShadowingDone !== progress.shadowingDone ||
    derivedAiDone !== progress.aiDone
  ) {
    progress = await prisma.dailyPathProgress.update({
      where: { id: progress.id },
      data: {
        sentencesDone: derivedSentencesDone,
        gameDone: derivedGameDone,
        shadowingDone: derivedShadowingDone,
        aiDone: derivedAiDone,
      },
    });
  }

  const links: DailyPathStepLinks = {
    sentencesHref: `/level/${progress.levelId}`,
    gameHref: gameRow ? `/level/${gameRow.levelId}/games/${gameRow.id}` : null,
    shadowingHref: storyRow ? `/shadowing?story=${storyRow.id}` : null,
    aiHref: progress.scenarioId
      ? `/ai-conversation?scenario=${progress.scenarioId}&dailyPath=1`
      : `/ai-conversation?dailyPath=1`,
  };

  const steps = [
    {
      key: 'sentences' as const,
      titleAr: '٥ جمل من مستواك',
      done: derivedSentencesDone,
      href: links.sentencesHref,
      items: orderedSentences,
    },
    {
      key: 'game' as const,
      titleAr: 'لعبة سريعة',
      done: derivedGameDone,
      href: links.gameHref,
      game: gameRow,
    },
    {
      key: 'shadowing' as const,
      titleAr: 'قصة شادونج',
      done: derivedShadowingDone,
      href: links.shadowingHref,
      story: storyRow,
      available: !!storyRow,
    },
    {
      key: 'ai' as const,
      titleAr: 'محادثة AI قصيرة',
      done: derivedAiDone,
      href: links.aiHref,
      scenario: scenarioRow,
      promptEn: progress.aiPromptEn,
    },
  ];

  const completedCount = steps.filter((s) => {
    if (s.key === 'shadowing' && !storyRow) return true;
    return s.done;
  }).length;

  return {
    date,
    levelId: progress.levelId,
    steps,
    completedCount,
    totalSteps: storyRow ? 4 : 3,
    allDone: completedCount >= (storyRow ? 4 : 3),
  };
}

export type DailyPathStepKey = 'sentences' | 'game' | 'shadowing' | 'ai';

export async function markDailyPathStep(userId: string, step: DailyPathStepKey) {
  const date = todayUtcDateString();
  await getOrCreateDailyPath(userId);

  const fieldMap: Record<DailyPathStepKey, 'sentencesDone' | 'gameDone' | 'shadowingDone' | 'aiDone'> = {
    sentences: 'sentencesDone',
    game: 'gameDone',
    shadowing: 'shadowingDone',
    ai: 'aiDone',
  };

  await prisma.dailyPathProgress.update({
    where: { userId_date: { userId, date } },
    data: { [fieldMap[step]]: true },
  });

  return getOrCreateDailyPath(userId);
}

export async function getWeeklyChallengeStatus(userId: string) {
  const weekKey = getIsoWeekKey();
  const weekNumber = getIsoWeekNumber();
  const challenge = getChallengeForWeek(weekNumber);

  let progress = await prisma.weeklyChallengeProgress.findUnique({
    where: { userId_weekKey: { userId, weekKey } },
  });

  if (!progress) {
    progress = await prisma.weeklyChallengeProgress.create({
      data: {
        userId,
        weekKey,
        challengeId: challenge.id,
      },
    });
  }

  // If challenge rotated for same week key edge-case, keep stored challengeId
  const active =
    WEEKLY_CHALLENGES.find((c) => c.id === progress!.challengeId) || challenge;

  return {
    weekKey,
    weekNumber,
    challenge: {
      id: active.id,
      titleAr: active.titleAr,
      promptEn: active.promptEn,
      tipAr: active.tipAr ?? null,
    },
    status: {
      attempted: progress.attempted,
      completed: progress.completed,
      score: progress.score,
    },
    startHref: `/ai-conversation?weeklyChallenge=1`,
  };
}

export async function updateWeeklyChallengeProgress(
  userId: string,
  data: { attempted?: boolean; completed?: boolean; score?: number | null }
) {
  const weekKey = getIsoWeekKey();
  const weekNumber = getIsoWeekNumber();
  const challenge = getChallengeForWeek(weekNumber);

  await prisma.weeklyChallengeProgress.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    create: {
      userId,
      weekKey,
      challengeId: challenge.id,
      attempted: data.attempted ?? false,
      completed: data.completed ?? false,
      score: data.score ?? null,
    },
    update: {
      ...(data.attempted !== undefined ? { attempted: data.attempted } : {}),
      ...(data.completed !== undefined ? { completed: data.completed } : {}),
      ...(data.score !== undefined ? { score: data.score } : {}),
      challengeId: challenge.id,
    },
  });

  return getWeeklyChallengeStatus(userId);
}
