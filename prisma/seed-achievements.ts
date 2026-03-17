import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const achievements = [
  // Streak Achievements
  {
    key: 'streak_3',
    nameAr: '٣ أيام متواصلة',
    descAr: 'درست لمدة ٣ أيام متتالية',
    icon: '🔥',
    condition: { type: 'streak', value: 3 },
  },
  {
    key: 'streak_7',
    nameAr: 'أسبوع متواصل',
    descAr: 'درست لمدة ٧ أيام متتالية',
    icon: '🔥',
    condition: { type: 'streak', value: 7 },
  },
  {
    key: 'streak_30',
    nameAr: 'شهر متواصل',
    descAr: 'درست لمدة ٣٠ يوماً متتالياً',
    icon: '🔥',
    condition: { type: 'streak', value: 30 },
  },
  {
    key: 'streak_100',
    nameAr: '١٠٠ يوم متواصل',
    descAr: 'درست لمدة ١٠٠ يوم متتالي - إنجاز رائع!',
    icon: '👑',
    condition: { type: 'streak', value: 100 },
  },

  // Sentence Achievements
  {
    key: 'sentences_10',
    nameAr: '١٠ جمل',
    descAr: 'أكملت ١٠ جمل',
    icon: '📚',
    condition: { type: 'sentences', value: 10 },
  },
  {
    key: 'sentences_25',
    nameAr: '٢٥ جملة',
    descAr: 'أكملت ٢٥ جملة',
    icon: '📚',
    condition: { type: 'sentences', value: 25 },
  },
  {
    key: 'sentences_50',
    nameAr: '٥٠ جملة',
    descAr: 'أكملت ٥٠ جملة',
    icon: '📖',
    condition: { type: 'sentences', value: 50 },
  },
  {
    key: 'sentences_100',
    nameAr: '١٠٠ جملة',
    descAr: 'أكملت ١٠٠ جملة',
    icon: '📖',
    condition: { type: 'sentences', value: 100 },
  },
  {
    key: 'sentences_175',
    nameAr: '١٧٥ جملة - الإتمام الكامل',
    descAr: 'أكملت جميع الجمل في المنصة!',
    icon: '🎓',
    condition: { type: 'sentences', value: 175 },
  },

  // Level Achievements
  {
    key: 'level_1',
    nameAr: 'إتمام المستوى الأول',
    descAr: 'أكملت المستوى الأول بنجاح',
    icon: '⭐',
    condition: { type: 'level_complete', value: 1 },
  },
  {
    key: 'level_3',
    nameAr: 'إتمام المستوى الثالث',
    descAr: 'أكملت المستوى الثالث',
    icon: '⭐',
    condition: { type: 'level_complete', value: 3 },
  },
  {
    key: 'level_5',
    nameAr: 'إتمام المستوى الخامس',
    descAr: 'أكملت المستوى الخامس',
    icon: '⭐',
    condition: { type: 'level_complete', value: 5 },
  },
  {
    key: 'level_7',
    nameAr: 'إتمام المستوى السابع',
    descAr: 'أكملت المستوى السابع - أعلى مستوى!',
    icon: '🏆',
    condition: { type: 'level_complete', value: 7 },
  },

  // AI Conversation Achievements
  {
    key: 'ai_first',
    nameAr: 'أول محادثة AI',
    descAr: 'أجريت أول محادثة مع الذكاء الاصطناعي',
    icon: '💬',
    condition: { type: 'ai_sessions', value: 1 },
  },
  {
    key: 'ai_5',
    nameAr: '٥ محادثات AI',
    descAr: 'أجريت ٥ محادثات مع الذكاء الاصطناعي',
    icon: '💬',
    condition: { type: 'ai_sessions', value: 5 },
  },
  {
    key: 'ai_10',
    nameAr: '١٠ محادثات AI',
    descAr: 'أجريت ١٠ محادثات مع الذكاء الاصطناعي',
    icon: '🤖',
    condition: { type: 'ai_sessions', value: 10 },
  },
  {
    key: 'ai_25',
    nameAr: '٢٥ محادثة AI',
    descAr: 'أجريت ٢٥ محادثة - متحدث ممتاز!',
    icon: '🤖',
    condition: { type: 'ai_sessions', value: 25 },
  },

  // Shadowing Achievements
  {
    key: 'shadowing_first',
    nameAr: 'أول قصة شادونج',
    descAr: 'أكملت أول قصة شادونج',
    icon: '🎙️',
    condition: { type: 'shadowing_complete', value: 1 },
  },
  {
    key: 'shadowing_5',
    nameAr: '٥ قصص شادونج',
    descAr: 'أكملت ٥ قصص شادونج',
    icon: '🎙️',
    condition: { type: 'shadowing_complete', value: 5 },
  },
  {
    key: 'shadowing_10',
    nameAr: '١٠ قصص شادونج',
    descAr: 'أكملت ١٠ قصص شادونج - نطقك ممتاز!',
    icon: '🎤',
    condition: { type: 'shadowing_complete', value: 10 },
  },

  // Special Achievements
  {
    key: 'course_complete',
    nameAr: 'إتمام الكورس الكامل',
    descAr: 'أكملت جميع المستويات السبعة - تهانينا!',
    icon: '👑',
    condition: { type: 'level_complete', value: 7 },
  },
  {
    key: 'early_bird',
    nameAr: 'الطائر المبكر',
    descAr: 'درست قبل الساعة ٨ صباحاً',
    icon: '🌅',
    condition: { type: 'special', value: 'early_morning' },
  },
  {
    key: 'night_owl',
    nameAr: 'بومة الليل',
    descAr: 'درست بعد الساعة ١٠ مساءً',
    icon: '🦉',
    condition: { type: 'special', value: 'late_night' },
  },
];

async function seedAchievements() {
  console.log('🌱 Seeding achievements...');

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    });
  }

  console.log(`✅ Seeded ${achievements.length} achievements`);
}

seedAchievements()
  .catch((e) => {
    console.error('❌ Error seeding achievements:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
