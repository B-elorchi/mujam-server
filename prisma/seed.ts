// prisma/seed.ts
// Complete seed file for معجم platform
// Contains all sentences extracted from the 6 official PDF booklets

import { Prisma, PrismaClient, GameType, UserRole, SubscriptionPlan, Difficulty } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedKidsCourses } from './seed-kids-courses'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  await seedLevels()
  await seedGrammarLevelsAndReorder()
  await seedSentences()
  await seedGrammarTips()
  await seedGrammarRules()
  await seedPlacementQuestions()
  await seedAISettings()
  await seedAIScenarios()
  await seedAchievements()
  await seedPlatformSettings()
  await seedNewsBanners()
  await seedKidsCourses(prisma)
  await seedCommunityRooms()
  await seedShadowingStories()
  await seedQuizzes()
  await seedGames()
  await seedSuperAdmin()

  console.log('✅ Seed complete!')
}

// ─────────────────────────────────────────
// LEVELS
// ─────────────────────────────────────────

async function seedLevels() {
  console.log('📚 Seeding levels...')

  const levels = [
    { id: 1, titleAr: 'السفر والمواصلات', titleEn: 'Travel & Transportation', icon: '✈️', orderIndex: 1, isFree: true, levelType: 'sentences' },
    { id: 2, titleAr: 'المستشفى', titleEn: 'Hospital', icon: '🏥', orderIndex: 2, isFree: true, levelType: 'sentences' },
    { id: 3, titleAr: 'العمل والمدرسة', titleEn: 'Work & School', icon: '💼', orderIndex: 3, isFree: true, levelType: 'sentences' },
    { id: 4, titleAr: 'المطعم', titleEn: 'Restaurant', icon: '🍽️', orderIndex: 4, isFree: true, levelType: 'sentences' },
    { id: 5, titleAr: 'التسوق', titleEn: 'Shopping', icon: '🛒', orderIndex: 5, isFree: true, levelType: 'sentences' },
    { id: 6, titleAr: 'التعارف والعلاقات', titleEn: 'Introductions & Relations', icon: '🤝', orderIndex: 6, isFree: true, levelType: 'sentences' },
    { id: 7, titleAr: 'التعارف والتحية', titleEn: 'Greetings & Meetings', icon: '👋', orderIndex: 7, isFree: true, levelType: 'sentences' },
    { id: 8, titleAr: 'في الفندق', titleEn: 'Hotel & Accommodation', icon: '🏨', orderIndex: 8, isFree: true, levelType: 'sentences' },
    { id: 9, titleAr: 'الخدمات اليومية', titleEn: 'Daily Services', icon: '📮', orderIndex: 9, isFree: true, levelType: 'sentences' },
    { id: 10, titleAr: 'العمل المتقدم', titleEn: 'Advanced Workplace', icon: '📈', orderIndex: 10, isFree: true, levelType: 'sentences' },
  ]

  for (const level of levels) {
    await prisma.level.upsert({
      where: { id: level.id },
      create: level,
      // Never overwrite orderIndex on update — grammar seed reorders 8–13 in the DB
      update: {
        titleAr: level.titleAr,
        titleEn: level.titleEn,
        icon: level.icon,
        isFree: level.isFree,
        levelType: level.levelType,
      },
    })
  }

  console.log(`  ✓ ${levels.length} levels seeded`)
}

/** Grammar levels use ids 11–13 so thematic levels (incl. hotel 8–10) keep stable FKs; orderIndex 8–10 puts them after level 7 in the learner path. */
async function seedGrammarLevelsAndReorder() {
  console.log('📐 Grammar levels + reorder (thematic Hotel→Work shifted to indices 11–13)...')

  await prisma.level.update({ where: { id: 8 }, data: { orderIndex: 100 } })
  await prisma.level.update({ where: { id: 9 }, data: { orderIndex: 101 } })
  await prisma.level.update({ where: { id: 10 }, data: { orderIndex: 102 } })

  const grammarLevels = [
    {
      id: 11,
      titleAr: 'الضمائر',
      titleEn: 'Pronouns',
      icon: '👤',
      orderIndex: 8,
      isFree: true,
      levelType: 'grammar',
    },
    {
      id: 12,
      titleAr: 'الأفعال الأساسية',
      titleEn: 'Basic Verbs',
      icon: '⚡',
      orderIndex: 9,
      isFree: true,
      levelType: 'grammar',
    },
    {
      id: 13,
      titleAr: 'بناء الجمل',
      titleEn: 'Sentence Structure',
      icon: '🧱',
      orderIndex: 10,
      isFree: true,
      levelType: 'grammar',
    },
  ]

  for (const level of grammarLevels) {
    await prisma.level.upsert({
      where: { id: level.id },
      create: { ...level, descriptionAr: null, isActive: true },
      update: {
        titleAr: level.titleAr,
        titleEn: level.titleEn,
        icon: level.icon,
        orderIndex: level.orderIndex,
        isFree: level.isFree,
        levelType: level.levelType,
        isActive: true,
      },
    })
  }

  await prisma.level.update({ where: { id: 8 }, data: { orderIndex: 11 } })
  await prisma.level.update({ where: { id: 9 }, data: { orderIndex: 12 } })
  await prisma.level.update({ where: { id: 10 }, data: { orderIndex: 13 } })

  console.log('  ✓ Grammar levels 11–13 + thematic order 11–13')
}

// ─────────────────────────────────────────
// SENTENCES — extracted from all 6 PDFs
// ─────────────────────────────────────────

async function seedSentences() {
  console.log('📝 Seeding sentences...')

  // Delete dependent records first to avoid FK constraints
  await prisma.userSentenceProgress.deleteMany({})
  await prisma.quizQuestion.deleteMany({})
  await prisma.gameQuestion.deleteMany({})

  // DON'T delete sentences - just upsert them to preserve audio URLs
  // await prisma.sentence.deleteMany({})

  const allSentences = [
    ...level1Sentences,   // السفر والمواصلات
    ...level2Sentences,   // المستشفى
    ...level3Sentences,   // العمل والمدرسة
    ...level4Sentences,   // المطعم
    ...level5Sentences,   // التسوق
    ...level6Sentences,   // التعارف والعلاقات
    ...level7Sentences,   // التعارف والتحية
    ...level8Sentences,   // الفندق
    ...level9Sentences,   // الخدمات اليومية
    ...level10Sentences,  // العمل المتقدم
  ]

  for (const sentence of allSentences) {
    // Find existing sentence by levelId and orderIndex
    const existing = await prisma.sentence.findFirst({
      where: {
        levelId: sentence.levelId,
        orderIndex: sentence.orderIndex,
      }
    })

    if (existing) {
      // Update text but preserve audioUrl if it exists
      await prisma.sentence.update({
        where: { id: existing.id },
        data: {
          textEn: sentence.textEn,
          textAr: sentence.textAr,
          // Don't update audioUrl - keep existing one
        },
      })
    } else {
      // Create new sentence
      await prisma.sentence.create({ data: sentence })
    }
  }

  console.log(`  ✓ ${allSentences.length} sentences seeded/updated`)
}

// ─────────────────────────────────────────
// LEVEL 1 — السفر والمواصلات (Travel & Transportation)
// Source: PDF "أهم 30 جملة في السفر والمواصلات"
// ─────────────────────────────────────────

const level1Sentences = [
  { levelId: 1, orderIndex: 1, textEn: 'Where is the nearest bus station?', textAr: 'أين تقع محطة الباص الأقرب؟' },
  { levelId: 1, orderIndex: 2, textEn: 'I need a taxi, please.', textAr: 'أحتاج سيارة أجرة من فضلك.' },
  { levelId: 1, orderIndex: 3, textEn: 'How much is the fare to the airport?', textAr: 'كم تكلفة التوصيل إلى المطار؟' },
  { levelId: 1, orderIndex: 4, textEn: 'Can you take me to this address?', textAr: 'هل يمكنك توصيلي إلى هذا العنوان؟' },
  { levelId: 1, orderIndex: 5, textEn: 'How far is this place from here?', textAr: 'كم يبعد هذا المكان عن هنا؟' },
  { levelId: 1, orderIndex: 6, textEn: 'How long does it take to get there?', textAr: 'كم يستغرق الوصول إلى هناك؟' },
  { levelId: 1, orderIndex: 7, textEn: 'Stop here, please.', textAr: 'من فضلك توقف هنا.' },
  { levelId: 1, orderIndex: 8, textEn: 'When does the next train leave?', textAr: 'متى يغادر القطار التالي؟' },
  { levelId: 1, orderIndex: 9, textEn: 'When will the train arrive?', textAr: 'متى سيصل القطار؟' },
  { levelId: 1, orderIndex: 10, textEn: 'I need a one-way ticket.', textAr: 'أحتاج تذكرة ذهاب فقط.' },
  { levelId: 1, orderIndex: 11, textEn: 'I need a round-trip ticket.', textAr: 'أحتاج تذكرة ذهاب وعودة.' },
  { levelId: 1, orderIndex: 12, textEn: 'Where is the ticket office, please?', textAr: 'من فضلك، أين مكتب بيع التذاكر؟' },
  { levelId: 1, orderIndex: 13, textEn: 'Can I pay by card for the ticket?', textAr: 'هل يمكنني الدفع بالبطاقة لشراء التذكرة؟' },
  { levelId: 1, orderIndex: 14, textEn: 'Is there a bus to downtown?', textAr: 'هل توجد حافلة إلى وسط المدينة؟' },
  { levelId: 1, orderIndex: 15, textEn: 'I would like a window seat.', textAr: 'أريد مقعدًا بجانب النافذة.' },
  { levelId: 1, orderIndex: 16, textEn: 'I would like an aisle seat.', textAr: 'أريد مقعدًا في الممر.' },
  { levelId: 1, orderIndex: 17, textEn: 'What time is the departure?', textAr: 'متى موعد الإقلاع؟' },
  { levelId: 1, orderIndex: 18, textEn: 'What time is the arrival?', textAr: 'متى موعد الوصول؟' },
  { levelId: 1, orderIndex: 19, textEn: 'Where is the boarding gate?', textAr: 'أين بوابة الصعود إلى الطائرة؟' },
  { levelId: 1, orderIndex: 20, textEn: 'Could you please help me with my luggage?', textAr: 'من فضلك، هل يمكنك مساعدتي بحقائبي؟' },
  { levelId: 1, orderIndex: 21, textEn: 'How much is the allowed weight?', textAr: 'كم الوزن المسموح به؟' },
  { levelId: 1, orderIndex: 22, textEn: 'My suitcase is lost, what should I do?', textAr: 'حقيبتي ضاعت، ماذا أفعل؟' },
  { levelId: 1, orderIndex: 23, textEn: 'Does this ticket include a meal?', textAr: 'هل تشمل هذه التذكرة وجبة؟' },
  { levelId: 1, orderIndex: 24, textEn: 'How many hours is the flight delayed?', textAr: 'الرحلة متأخرة كم ساعة؟' },
  { levelId: 1, orderIndex: 25, textEn: 'Can I change my seat?', textAr: 'هل يمكنني تغيير مقعدي؟' },
  { levelId: 1, orderIndex: 26, textEn: 'I need a rental car.', textAr: 'أحتاج سيارة للإيجار.' },
  { levelId: 1, orderIndex: 27, textEn: 'How much is it to rent the car for one day?', textAr: 'ما هي تكلفة استئجار السيارة لليوم الواحد؟' },
  { levelId: 1, orderIndex: 28, textEn: 'I need a map of the city.', textAr: 'أحتاج خريطة للمدينة.' },
  { levelId: 1, orderIndex: 29, textEn: 'Can you show me this place on the map?', textAr: 'هل يمكنك أن تريني هذا المكان على الخريطة؟' },
  { levelId: 1, orderIndex: 30, textEn: 'I am lost, can you help me?', textAr: 'أنا ضائع، هل يمكنك مساعدتي؟' },
]

// ─────────────────────────────────────────
// LEVEL 2 — المستشفى (Hospital)
// Source: PDF "أهم 30 جملة في المستشفى"
// ─────────────────────────────────────────

const level2Sentences = [
  { levelId: 2, orderIndex: 1, textEn: 'I need a doctor quickly.', textAr: 'أحتاج إلى طبيب بسرعة.' },
  { levelId: 2, orderIndex: 2, textEn: 'Where is the nearest hospital?', textAr: 'أين يقع أقرب مستشفى؟' },
  { levelId: 2, orderIndex: 3, textEn: 'Please call an ambulance.', textAr: 'من فضلك، اتصل بالإسعاف.' },
  { levelId: 2, orderIndex: 4, textEn: 'I have severe pain in my stomach.', textAr: 'لدي ألم شديد في معدتي.' },
  { levelId: 2, orderIndex: 5, textEn: 'I feel dizzy.', textAr: 'أشعر بالدوخة.' },
  { levelId: 2, orderIndex: 6, textEn: 'I have a high fever.', textAr: 'لدي حرارة مرتفعة.' },
  { levelId: 2, orderIndex: 7, textEn: 'I cannot breathe well.', textAr: 'لا أستطيع التنفس جيدًا.' },
  { levelId: 2, orderIndex: 8, textEn: 'Can you help me find the pharmacy?', textAr: 'هل يمكنك مساعدتي في العثور على الصيدلية؟' },
  { levelId: 2, orderIndex: 9, textEn: 'I need some painkillers.', textAr: 'أحتاج إلى مسكن للألم.' },
  { levelId: 2, orderIndex: 10, textEn: 'I am allergic to peanuts.', textAr: 'لدي حساسية من الفول السوداني.' },
  { levelId: 2, orderIndex: 11, textEn: 'Can I get a prescription?', textAr: 'هل يمكنني الحصول على وصفة طبية؟' },
  { levelId: 2, orderIndex: 12, textEn: 'Do you have medicine for cold?', textAr: 'هل لديك دواء للبرد؟' },
  { levelId: 2, orderIndex: 13, textEn: 'I need an appointment with the dentist.', textAr: 'أحتاج إلى موعد مع طبيب الأسنان.' },
  { levelId: 2, orderIndex: 14, textEn: 'I have a toothache.', textAr: 'عندي ألم في الأسنان.' },
  { levelId: 2, orderIndex: 15, textEn: 'I have a strong headache.', textAr: 'عندي صداع قوي.' },
  { levelId: 2, orderIndex: 16, textEn: 'How long is the waiting time to see the doctor?', textAr: 'كم مدة الانتظار لرؤية الطبيب؟' },
  { levelId: 2, orderIndex: 17, textEn: 'Can I see a female doctor instead?', textAr: 'هل يمكنني مقابلة طبيبة بدلًا من طبيب؟' },
  { levelId: 2, orderIndex: 18, textEn: 'Do I need to stay in the hospital?', textAr: 'هل أحتاج للبقاء في المستشفى؟' },
  { levelId: 2, orderIndex: 19, textEn: 'When will I get the test results?', textAr: 'متى سأحصل على نتائج التحاليل؟' },
  { levelId: 2, orderIndex: 20, textEn: 'Can I take this medicine with food?', textAr: 'هل يمكنني أخذ الدواء مع الطعام؟' },
  { levelId: 2, orderIndex: 21, textEn: 'I am not feeling better.', textAr: 'لا أشعر بتحسن.' },
  { levelId: 2, orderIndex: 22, textEn: 'I feel better now.', textAr: 'أشعر بتحسن الآن.' },
  { levelId: 2, orderIndex: 23, textEn: 'When should I come back for a follow-up?', textAr: 'متى يجب أن أعود للمراجعة؟' },
  { levelId: 2, orderIndex: 24, textEn: 'Do you have a medical translator?', textAr: 'هل لديكم مترجم طبي؟' },
  { levelId: 2, orderIndex: 25, textEn: 'I need a blood test.', textAr: 'أحتاج إلى تحليل دم.' },
  { levelId: 2, orderIndex: 26, textEn: 'Where is the emergency room?', textAr: 'أين غرفة الطوارئ؟' },
  { levelId: 2, orderIndex: 27, textEn: 'I have chest pain.', textAr: 'أشعر بألم في صدري.' },
  { levelId: 2, orderIndex: 28, textEn: 'How much do these medicines cost?', textAr: 'كم تكلفة هذه الأدوية؟' },
  { levelId: 2, orderIndex: 29, textEn: 'Thank you for your help.', textAr: 'شكرًا لمساعدتكم.' },
  { levelId: 2, orderIndex: 30, textEn: 'Can I get a prescription?', textAr: 'هل يمكنني الحصول على وصفة طبية؟' },
]

// ─────────────────────────────────────────
// LEVEL 3 — العمل والمدرسة (Work & School)
// Source: PDF "أهم 30 جملة في العمل والمدرسة"
// ─────────────────────────────────────────

const level3Sentences = [
  { levelId: 3, orderIndex: 1, textEn: 'I am a university student.', textAr: 'أنا طالب في الجامعة.' },
  { levelId: 3, orderIndex: 2, textEn: 'I study English.', textAr: 'أدرس اللغة الإنجليزية.' },
  { levelId: 3, orderIndex: 3, textEn: 'What major are you studying?', textAr: 'ما التخصص الذي تدرسه؟' },
  { levelId: 3, orderIndex: 4, textEn: 'I need help with this homework.', textAr: 'أحتاج لمساعدة في هذا الواجب.' },
  { levelId: 3, orderIndex: 5, textEn: 'Can you explain this to me?', textAr: 'هل يمكنك شرح هذا لي؟' },
  { levelId: 3, orderIndex: 6, textEn: 'When is the next exam?', textAr: 'متى موعد الامتحان القادم؟' },
  { levelId: 3, orderIndex: 7, textEn: 'I need more time to finish the research.', textAr: 'أحتاج إلى المزيد من الوقت لإنهاء البحث.' },
  { levelId: 3, orderIndex: 8, textEn: 'I enjoy attending lectures.', textAr: 'أحب حضور المحاضرات.' },
  { levelId: 3, orderIndex: 9, textEn: 'I want to learn new vocabulary.', textAr: 'أريد أن أتعلم كلمات جديدة.' },
  { levelId: 3, orderIndex: 10, textEn: 'I need a dictionary for translation.', textAr: 'أحتاج قاموسًا للترجمة.' },
  { levelId: 3, orderIndex: 11, textEn: 'Do you have a book I can borrow?', textAr: 'هل لديك كتاب يمكنني استعارته؟' },
  { levelId: 3, orderIndex: 12, textEn: 'I work in a marketing company.', textAr: 'أعمل في شركة تسويق.' },
  { levelId: 3, orderIndex: 13, textEn: 'What is your job?', textAr: 'ما هو عملك؟' },
  { levelId: 3, orderIndex: 14, textEn: 'I work as an engineer.', textAr: 'أعمل كمهندس.' },
  { levelId: 3, orderIndex: 15, textEn: 'I have an important meeting tomorrow.', textAr: 'لدي اجتماع مهم غدًا.' },
  { levelId: 3, orderIndex: 16, textEn: 'I need to send an email.', textAr: 'أحتاج أن أرسل بريدًا إلكترونيًا.' },
  { levelId: 3, orderIndex: 17, textEn: 'Can you reply to this message?', textAr: 'هل يمكنك الرد على هذه الرسالة؟' },
  { levelId: 3, orderIndex: 18, textEn: 'I want to give a presentation.', textAr: 'أريد أن أقدم عرضًا تقديميًا.' },
  { levelId: 3, orderIndex: 19, textEn: 'How many employees are in this company?', textAr: 'كم عدد الموظفين في هذه الشركة؟' },
  { levelId: 3, orderIndex: 20, textEn: 'Can you help me with the project?', textAr: 'هل يمكنك مساعدتي في المشروع؟' },
  { levelId: 3, orderIndex: 21, textEn: 'What time does work finish?', textAr: 'متى ينتهي وقت العمل؟' },
  { levelId: 3, orderIndex: 22, textEn: 'What time does work start?', textAr: 'متى يبدأ وقت العمل؟' },
  { levelId: 3, orderIndex: 23, textEn: 'I am very busy right now.', textAr: 'أنا مشغول جدًا الآن.' },
  { levelId: 3, orderIndex: 24, textEn: 'I have a one-hour lunch break.', textAr: 'لدي استراحة غداء لمدة ساعة.' },
  { levelId: 3, orderIndex: 25, textEn: 'I need to print this file.', textAr: 'أحتاج أن أطبع هذا الملف.' },
  { levelId: 3, orderIndex: 26, textEn: 'Where is the meeting room?', textAr: 'أين غرفة الاجتماعات؟' },
  { levelId: 3, orderIndex: 27, textEn: 'Can we discuss this later?', textAr: 'هل يمكننا مناقشة هذا لاحقًا؟' },
  { levelId: 3, orderIndex: 28, textEn: 'This is a very important topic.', textAr: 'هذا موضوع مهم جدًا.' },
  { levelId: 3, orderIndex: 29, textEn: 'I agree with your opinion.', textAr: 'أوافق على رأيك.' },
  { levelId: 3, orderIndex: 30, textEn: 'Thank you for your cooperation.', textAr: 'شكرًا لتعاونك.' },
]

// ─────────────────────────────────────────
// LEVEL 4 — المطعم (Restaurant)
// Source: PDF "أهم 30 جملة في المطعم"
// ─────────────────────────────────────────

const level4Sentences = [
  { levelId: 4, orderIndex: 1, textEn: 'Hello, table for two, please.', textAr: 'مرحبًا، طاولة لشخصين من فضلك.' },
  { levelId: 4, orderIndex: 2, textEn: 'Good evening, do you have any available tables?', textAr: 'مساء الخير، هل لديكم طاولات متاحة؟' },
  { levelId: 4, orderIndex: 3, textEn: 'Can we sit by the window, please?', textAr: 'هل يمكننا الجلوس بجانب النافذة من فضلك؟' },
  { levelId: 4, orderIndex: 4, textEn: 'Thank you for seating us.', textAr: 'شكرًا لمساعدتك لنا في الجلوس.' },
  { levelId: 4, orderIndex: 5, textEn: 'May I see the menu, please?', textAr: 'هل يمكنني رؤية قائمة الطعام من فضلك؟' },
  { levelId: 4, orderIndex: 6, textEn: 'What dishes do you recommend today?', textAr: 'ما الأطباق التي تنصح بها اليوم؟' },
  { levelId: 4, orderIndex: 7, textEn: 'Do you have vegetarian options?', textAr: 'هل لديكم خيارات نباتية؟' },
  { levelId: 4, orderIndex: 8, textEn: 'I would like a glass of water, please.', textAr: 'من فضلك، أريد كوب ماء.' },
  { levelId: 4, orderIndex: 9, textEn: 'Can I have some bread to start, please?', textAr: 'هل يمكنني الحصول على بعض الخبز أولًا؟' },
  { levelId: 4, orderIndex: 10, textEn: 'I will have the chicken with rice.', textAr: 'سأطلب طبق الدجاج مع الأرز.' },
  { levelId: 4, orderIndex: 11, textEn: 'I would like the salad without onions, please.', textAr: 'أريد السلطة بدون بصل لو سمحت.' },
  { levelId: 4, orderIndex: 12, textEn: 'Could you make the food not spicy, please?', textAr: 'هل يمكن أن يكون الطعام غير حار؟' },
  { levelId: 4, orderIndex: 13, textEn: 'The food is very delicious.', textAr: 'الطعام لذيذ جدًا.' },
  { levelId: 4, orderIndex: 14, textEn: 'Excuse me, this is not what I ordered.', textAr: 'أعذرني، هذا ليس ما طلبته.' },
  { levelId: 4, orderIndex: 15, textEn: 'Could you bring me an extra knife, please?', textAr: 'هل يمكنك أن تحضر لي سكينًا إضافيًا؟' },
  { levelId: 4, orderIndex: 16, textEn: 'I need an extra fork and spoon.', textAr: 'أحتاج إلى شوكة وملعقة إضافية.' },
  { levelId: 4, orderIndex: 17, textEn: 'The bill, please.', textAr: 'الحساب من فضلك.' },
  { levelId: 4, orderIndex: 18, textEn: 'Can I pay by card?', textAr: 'هل يمكنني الدفع بالبطاقة؟' },
  { levelId: 4, orderIndex: 19, textEn: 'Do you accept mobile payment?', textAr: 'هل لديكم خدمة الدفع عبر الهاتف؟' },
  { levelId: 4, orderIndex: 20, textEn: "I'm sorry, but the food is cold.", textAr: 'أعتذر، لكن الطعام بارد.' },
  { levelId: 4, orderIndex: 21, textEn: 'I would like the same dish but in a small size.', textAr: 'أريد نفس الطبق لكن بحجم صغير.' },
  { levelId: 4, orderIndex: 22, textEn: 'Can I change my order?', textAr: 'هل يمكنني تغيير طلبي؟' },
  { levelId: 4, orderIndex: 23, textEn: 'Do you serve desserts?', textAr: 'هل تقدمون حلويات؟' },
  { levelId: 4, orderIndex: 24, textEn: 'What is your most popular dessert?', textAr: 'ما هي أشهر حلوى عندكم؟' },
  { levelId: 4, orderIndex: 25, textEn: 'Coffee without sugar, please.', textAr: 'القهوة بدون سكر من فضلك.' },
  { levelId: 4, orderIndex: 26, textEn: 'I would like tea with milk.', textAr: 'أريد الشاي بالحليب.' },
  { levelId: 4, orderIndex: 27, textEn: 'The service is excellent, thank you.', textAr: 'الخدمة ممتازة، شكرًا لكم.' },
  { levelId: 4, orderIndex: 28, textEn: 'We will come back again.', textAr: 'سنعود لزيارتكم مرة أخرى.' },
  { levelId: 4, orderIndex: 29, textEn: 'Can we take the leftover food with us?', textAr: 'هل يمكننا أخذ الطعام المتبقي معنا؟' },
  { levelId: 4, orderIndex: 30, textEn: 'It was a great experience, thank you very much.', textAr: 'كانت تجربة رائعة، شكرًا جزيلًا.' },
]

// ─────────────────────────────────────────
// LEVEL 5 — التسوق (Shopping)
// Source: PDF "أهم 30 جملة في التسوق"
// ─────────────────────────────────────────

const level5Sentences = [
  { levelId: 5, orderIndex: 1, textEn: 'How much does this product cost, please?', textAr: 'بكم سعر هذا المنتج من فضلك؟' },
  { levelId: 5, orderIndex: 2, textEn: 'Do you have other sizes for this shirt?', textAr: 'هل لديكم مقاسات أخرى لهذا القميص؟' },
  { levelId: 5, orderIndex: 3, textEn: 'Is this shoe available in a different color?', textAr: 'هل يوجد هذا الحذاء بلون مختلف؟' },
  { levelId: 5, orderIndex: 4, textEn: 'I am looking for a black leather bag.', textAr: 'أبحث عن حقيبة جلدية سوداء.' },
  { levelId: 5, orderIndex: 5, textEn: 'Can I try this shirt on?', textAr: 'هل يمكنني تجربة هذا القميص؟' },
  { levelId: 5, orderIndex: 6, textEn: 'Where is the fitting room?', textAr: 'أين غرفة القياس؟' },
  { levelId: 5, orderIndex: 7, textEn: 'This shirt is too small for me.', textAr: 'هذا القميص صغير جدًا علي.' },
  { levelId: 5, orderIndex: 8, textEn: 'This size is too big for me.', textAr: 'هذا المقاس كبير جدًا علي.' },
  { levelId: 5, orderIndex: 9, textEn: 'I like this item, I will buy it.', textAr: 'أعجبني هذا المنتج، سأشتريه.' },
  { levelId: 5, orderIndex: 10, textEn: 'Do you have a discount on this item?', textAr: 'هل لديكم خصم على هذه القطعة؟' },
  { levelId: 5, orderIndex: 11, textEn: 'If I buy two pieces, can I get a discount?', textAr: 'إذا اشتريت قطعتين، هل يمكنني الحصول على خصم؟' },
  { levelId: 5, orderIndex: 12, textEn: 'I need the receipt, please.', textAr: 'أحتاج إيصال الشراء من فضلك.' },
  { levelId: 5, orderIndex: 13, textEn: 'Can I pay with a card?', textAr: 'هل يمكنني الدفع بالبطاقة؟' },
  { levelId: 5, orderIndex: 14, textEn: 'Do you accept cash only?', textAr: 'هل تقبلون الدفع نقدًا فقط؟' },
  { levelId: 5, orderIndex: 15, textEn: 'I want to return this product.', textAr: 'أريد استرجاع هذا المنتج.' },
  { levelId: 5, orderIndex: 16, textEn: 'I want to exchange this item for another size.', textAr: 'أريد تبديل هذه القطعة بمقاس آخر.' },
  { levelId: 5, orderIndex: 17, textEn: 'This product is damaged.', textAr: 'هذا المنتج تالف.' },
  { levelId: 5, orderIndex: 18, textEn: 'This is exactly what I am looking for.', textAr: 'هذا تمامًا ما أبحث عنه.' },
  { levelId: 5, orderIndex: 19, textEn: 'Do you have more in stock?', textAr: 'هل لديكم المزيد في المخزن؟' },
  { levelId: 5, orderIndex: 20, textEn: 'When will this product be available again?', textAr: 'متى سيكون هذا المنتج متوفرًا مرة أخرى؟' },
  { levelId: 5, orderIndex: 21, textEn: "I don't need a bag, thank you.", textAr: 'لا أحتاج إلى كيس، شكرًا.' },
  { levelId: 5, orderIndex: 22, textEn: 'Can I have a bag, please?', textAr: 'هل يمكنني الحصول على كيس؟' },
  { levelId: 5, orderIndex: 23, textEn: 'Can I pay using my phone?', textAr: 'هل يمكنني الدفع عبر الهاتف؟' },
  { levelId: 5, orderIndex: 24, textEn: 'Where is the nearest ATM?', textAr: 'أين أقرب صراف آلي؟' },
  { levelId: 5, orderIndex: 25, textEn: 'How much is this per kilo?', textAr: 'كم سعر هذا بالكيلو؟' },
  { levelId: 5, orderIndex: 26, textEn: 'Can I pay in installments?', textAr: 'هل يمكنني الدفع بالتقسيط؟' },
  { levelId: 5, orderIndex: 27, textEn: 'This offer is very good.', textAr: 'هذا العرض جيد جدًا.' },
  { levelId: 5, orderIndex: 28, textEn: 'Thank you for your help.', textAr: 'شكرًا على مساعدتك.' },
  { levelId: 5, orderIndex: 29, textEn: 'I will come back to buy again.', textAr: 'سأعود للشراء مرة أخرى.' },
  { levelId: 5, orderIndex: 30, textEn: 'It was a great shopping experience.', textAr: 'كانت تجربة تسوق رائعة.' },
]

// ─────────────────────────────────────────
// LEVEL 6 — التعارف والعلاقات (Introductions & Relationships)
// Source: PDF "أهم 30 جملة في العلاقات والتحية والتعارف"
// ─────────────────────────────────────────

const level6Sentences = [
  { levelId: 6, orderIndex: 1, textEn: 'Hello, how are you today?', textAr: 'مرحبًا، كيف حالك اليوم؟' },
  { levelId: 6, orderIndex: 2, textEn: 'Good morning, I wish you a happy day.', textAr: 'صباح الخير، أتمنى لك يومًا سعيدًا.' },
  { levelId: 6, orderIndex: 3, textEn: 'Good evening, how was your day?', textAr: 'مساء الخير، كيف كان يومك؟' },
  { levelId: 6, orderIndex: 4, textEn: "It's a pleasure to meet you.", textAr: 'تشرفت بلقائك.' },
  { levelId: 6, orderIndex: 5, textEn: 'Nice to meet you too.', textAr: 'سعيد بلقائك أيًا.' },
  { levelId: 6, orderIndex: 6, textEn: 'What is your name, please?', textAr: 'ما اسمك من فضلك؟' },
  { levelId: 6, orderIndex: 7, textEn: 'My name is ...', textAr: '...اسمي' },
  { levelId: 6, orderIndex: 8, textEn: 'Where are you from?', textAr: 'من أين أنت؟' },
  { levelId: 6, orderIndex: 9, textEn: 'I am from Saudi Arabia.', textAr: 'أنا من السعودية.' },
  { levelId: 6, orderIndex: 10, textEn: 'How old are you?', textAr: 'كم عمرك؟' },
  { levelId: 6, orderIndex: 11, textEn: 'I am ... years old.', textAr: 'عمري ... سنة.' },
  { levelId: 6, orderIndex: 12, textEn: 'Do you speak English?', textAr: 'هل تتحدث الإنجليزية؟' },
  { levelId: 6, orderIndex: 13, textEn: 'Yes, only a little.', textAr: 'نعم، قليلًا فقط.' },
  { levelId: 6, orderIndex: 14, textEn: "No, I don't speak English.", textAr: 'لا، لا أتحدث الإنجليزية.' },
  { levelId: 6, orderIndex: 15, textEn: 'Can you speak more slowly?', textAr: 'هل يمكنك التحدث ببطء أكثر؟' },
  { levelId: 6, orderIndex: 16, textEn: 'Could you repeat that, please?', textAr: 'هل يمكنك تكرار ذلك من فضلك؟' },
  { levelId: 6, orderIndex: 17, textEn: 'What does this word mean?', textAr: 'ماذا تعني هذه الكلمة؟' },
  { levelId: 6, orderIndex: 18, textEn: 'Are you here for the first time?', textAr: 'هل أنت هنا لأول مرة؟' },
  { levelId: 6, orderIndex: 19, textEn: 'How long have you been living here?', textAr: 'منذ متى وأنت تعيش هنا؟' },
  { levelId: 6, orderIndex: 20, textEn: 'Can you tell me more about yourself?', textAr: 'هل يمكنك أن تخبرني أكثر عن نفسك؟' },
  { levelId: 6, orderIndex: 21, textEn: 'I am happy talking to you.', textAr: 'سعيد بمحادثتك.' },
  { levelId: 6, orderIndex: 22, textEn: 'See you later.', textAr: 'أراك لاحقًا.' },
  { levelId: 6, orderIndex: 23, textEn: 'See you tomorrow.', textAr: 'أراك غدًا.' },
  { levelId: 6, orderIndex: 24, textEn: 'See you soon.', textAr: 'أراك قريبًا.' },
  { levelId: 6, orderIndex: 25, textEn: 'Goodbye, take care.', textAr: 'وداعًا، اعتن بنفسك.' },
  { levelId: 6, orderIndex: 26, textEn: 'I wish you a safe trip.', textAr: 'أتمنى لك رحلة سعيدة.' },
  { levelId: 6, orderIndex: 27, textEn: "It's good to see you again.", textAr: 'من الجيد رؤيتك مرة أخرى.' },
  { levelId: 6, orderIndex: 28, textEn: 'Thank you for your time.', textAr: 'شكرًا على وقتك.' },
  { levelId: 6, orderIndex: 29, textEn: 'I hope we talk again soon.', textAr: 'أتمنى أن نتحدث مرة أخرى قريبًا.' },
  { levelId: 6, orderIndex: 30, textEn: 'Goodbye.', textAr: 'إلى اللقاء.' },
]

const level7Sentences = [
  { levelId: 7, orderIndex: 1, textEn: 'Nice to meet you. What do you do?', textAr: 'تشرفت بمعرفتك. ما مجال عملك؟' },
  { levelId: 7, orderIndex: 2, textEn: 'I recently moved to this city.', textAr: 'انتقلت مؤخرًا إلى هذه المدينة.' },
  { levelId: 7, orderIndex: 3, textEn: 'Can we exchange contact details?', textAr: 'هل يمكننا تبادل معلومات التواصل؟' },
  { levelId: 7, orderIndex: 4, textEn: 'Let us keep in touch.', textAr: 'دعنا نبقى على تواصل.' },
  { levelId: 7, orderIndex: 5, textEn: 'It was great talking with you.', textAr: 'سعدت كثيرًا بالحديث معك.' },
  { levelId: 7, orderIndex: 6, textEn: 'Do you have any plans this weekend?', textAr: 'هل لديك أي خطط لهذا الأسبوع؟' },
  { levelId: 7, orderIndex: 7, textEn: 'Would you like to grab coffee sometime?', textAr: 'هل ترغب في تناول القهوة يومًا ما؟' },
  { levelId: 7, orderIndex: 8, textEn: 'Thanks for the invitation.', textAr: 'شكرًا على الدعوة.' },
  { levelId: 7, orderIndex: 9, textEn: 'I am still improving my English.', textAr: 'ما زلت أطور لغتي الإنجليزية.' },
  { levelId: 7, orderIndex: 10, textEn: 'Could you speak a little more clearly?', textAr: 'هل يمكنك التحدث بوضوح أكثر قليلًا؟' },
]

const level8Sentences = [
  { levelId: 8, orderIndex: 1, textEn: 'I have a reservation under my name.', textAr: 'لدي حجز باسمي.' },
  { levelId: 8, orderIndex: 2, textEn: 'Can I check in early?', textAr: 'هل يمكنني تسجيل الدخول مبكرًا؟' },
  { levelId: 8, orderIndex: 3, textEn: 'Is breakfast included with the room?', textAr: 'هل الإفطار مشمول مع الغرفة؟' },
  { levelId: 8, orderIndex: 4, textEn: 'Could you send extra towels, please?', textAr: 'هل يمكن إرسال مناشف إضافية من فضلك؟' },
  { levelId: 8, orderIndex: 5, textEn: 'The air conditioner is not working.', textAr: 'مكيف الهواء لا يعمل.' },
  { levelId: 8, orderIndex: 6, textEn: 'Can I request a late check-out?', textAr: 'هل يمكنني طلب تسجيل خروج متأخر؟' },
  { levelId: 8, orderIndex: 7, textEn: 'Where is the nearest metro station?', textAr: 'أين أقرب محطة مترو؟' },
  { levelId: 8, orderIndex: 8, textEn: 'Please call a taxi for me.', textAr: 'يرجى طلب سيارة أجرة لي.' },
  { levelId: 8, orderIndex: 9, textEn: 'Could you recommend a good restaurant nearby?', textAr: 'هل يمكنك اقتراح مطعم جيد قريب؟' },
  { levelId: 8, orderIndex: 10, textEn: 'Thank you for your hospitality.', textAr: 'شكرًا على حسن الضيافة.' },
]

const level9Sentences = [
  { levelId: 9, orderIndex: 1, textEn: 'I need to open a bank account.', textAr: 'أحتاج إلى فتح حساب بنكي.' },
  { levelId: 9, orderIndex: 2, textEn: 'Where can I pay this bill?', textAr: 'أين يمكنني دفع هذه الفاتورة؟' },
  { levelId: 9, orderIndex: 3, textEn: 'I would like to send this package.', textAr: 'أود إرسال هذه الشحنة.' },
  { levelId: 9, orderIndex: 4, textEn: 'Can you help me fill out this form?', textAr: 'هل يمكنك مساعدتي في تعبئة هذا النموذج؟' },
  { levelId: 9, orderIndex: 5, textEn: 'I need to renew my membership.', textAr: 'أحتاج إلى تجديد عضويتي.' },
  { levelId: 9, orderIndex: 6, textEn: 'What documents are required?', textAr: 'ما هي المستندات المطلوبة؟' },
  { levelId: 9, orderIndex: 7, textEn: 'Can I book an appointment online?', textAr: 'هل يمكنني حجز موعد عبر الإنترنت؟' },
  { levelId: 9, orderIndex: 8, textEn: 'How long does the process take?', textAr: 'كم يستغرق هذا الإجراء؟' },
  { levelId: 9, orderIndex: 9, textEn: 'I did not receive the confirmation email.', textAr: 'لم أستلم رسالة التأكيد الإلكترونية.' },
  { levelId: 9, orderIndex: 10, textEn: 'Could you explain the next step?', textAr: 'هل يمكنك شرح الخطوة التالية؟' },
]

const level10Sentences = [
  { levelId: 10, orderIndex: 1, textEn: 'Let us align on the project priorities.', textAr: 'دعنا نتفق على أولويات المشروع.' },
  { levelId: 10, orderIndex: 2, textEn: 'We need to review the timeline and risks.', textAr: 'نحتاج إلى مراجعة الجدول الزمني والمخاطر.' },
  { levelId: 10, orderIndex: 3, textEn: 'Could you share the updated report by noon?', textAr: 'هل يمكنك مشاركة التقرير المحدث قبل الظهر؟' },
  { levelId: 10, orderIndex: 4, textEn: 'I suggest we focus on measurable outcomes.', textAr: 'أقترح أن نركز على نتائج قابلة للقياس.' },
  { levelId: 10, orderIndex: 5, textEn: 'Please escalate blockers as soon as possible.', textAr: 'يرجى تصعيد العوائق بأسرع وقت ممكن.' },
  { levelId: 10, orderIndex: 6, textEn: 'Can we schedule a follow-up meeting tomorrow?', textAr: 'هل يمكننا جدولة اجتماع متابعة غدًا؟' },
  { levelId: 10, orderIndex: 7, textEn: 'The client requested a revised proposal.', textAr: 'طلب العميل عرضًا معدلًا.' },
  { levelId: 10, orderIndex: 8, textEn: 'Let us finalize the action items.', textAr: 'دعنا ننهي بنود العمل.' },
  { levelId: 10, orderIndex: 9, textEn: 'Thanks everyone for the productive discussion.', textAr: 'شكرًا للجميع على النقاش المثمر.' },
  { levelId: 10, orderIndex: 10, textEn: 'We are on track to meet the deadline.', textAr: 'نحن على المسار الصحيح للالتزام بالموعد النهائي.' },
]

// ─────────────────────────────────────────
// PLACEMENT TEST QUESTIONS
// Pool: ≥4 per level (API picks 2 random per level + shuffles) so users don’t share the same items
// ─────────────────────────────────────────

async function seedPlacementQuestions() {
  console.log('📋 Seeding placement questions...')

  await prisma.placementQuestion.deleteMany({})

  const questions = [
    // Level 1 — Travel (basic)
    {
      sentenceEn: 'Where is the nearest bus station?',
      correctAr: 'أين تقع محطة الباص الأقرب؟',
      options: ['أين تقع محطة الباص الأقرب؟', 'كم تكلفة التوصيل؟', 'متى يغادر القطار؟', 'أحتاج سيارة أجرة.'],
      targetLevel: 1, orderIndex: 1,
    },
    {
      sentenceEn: 'I need a taxi, please.',
      correctAr: 'أحتاج سيارة أجرة من فضلك.',
      options: ['أحتاج سيارة أجرة من فضلك.', 'أين المطار؟', 'هل لديك تذكرة؟', 'أنا ضائع.'],
      targetLevel: 1, orderIndex: 2,
    },
    // Level 2 — Hospital (basic-intermediate)
    {
      sentenceEn: 'I have a high fever.',
      correctAr: 'لدي حرارة مرتفعة.',
      options: ['لدي حرارة مرتفعة.', 'أشعر بالجوع.', 'أحتاج إلى قاموس.', 'لدي اجتماع.'],
      targetLevel: 2, orderIndex: 3,
    },
    {
      sentenceEn: 'Where is the emergency room?',
      correctAr: 'أين غرفة الطوارئ؟',
      options: ['أين غرفة الطوارئ؟', 'أين غرفة الاجتماعات؟', 'أين المطعم؟', 'أين المكتبة؟'],
      targetLevel: 2, orderIndex: 4,
    },
    // Level 3 — Work & School (intermediate)
    {
      sentenceEn: 'I have an important meeting tomorrow.',
      correctAr: 'لدي اجتماع مهم غدًا.',
      options: ['لدي اجتماع مهم غدًا.', 'أحتاج طبيبًا.', 'أريد طاولة لشخصين.', 'هذا المقاس كبير علي.'],
      targetLevel: 3, orderIndex: 5,
    },
    {
      sentenceEn: 'Can you explain this to me?',
      correctAr: 'هل يمكنك شرح هذا لي؟',
      options: ['هل يمكنك شرح هذا لي؟', 'هل يمكنك التوقف هنا؟', 'هل يمكنك مساعدتي بحقائبي؟', 'هل يمكنك إحضار الحساب؟'],
      targetLevel: 3, orderIndex: 6,
    },
    // Level 4 — Restaurant (upper-intermediate)
    {
      sentenceEn: 'Could you make the food not spicy, please?',
      correctAr: 'هل يمكن أن يكون الطعام غير حار؟',
      options: ['هل يمكن أن يكون الطعام غير حار؟', 'هل يمكن أن يكون الطعام باردًا؟', 'هل يمكن أن يكون الطعام نباتيًا؟', 'أين المطعم؟'],
      targetLevel: 4, orderIndex: 7,
    },
    {
      sentenceEn: 'Excuse me, this is not what I ordered.',
      correctAr: 'أعذرني، هذا ليس ما طلبته.',
      options: ['أعذرني، هذا ليس ما طلبته.', 'أعذرني، الطعام لذيذ جدًا.', 'أعذرني، أريد الحساب.', 'أعذرني، أين الحمام؟'],
      targetLevel: 4, orderIndex: 8,
    },
    // Level 5 — Shopping (upper-intermediate)
    {
      sentenceEn: 'If I buy two pieces, can I get a discount?',
      correctAr: 'إذا اشتريت قطعتين، هل يمكنني الحصول على خصم؟',
      options: ['إذا اشتريت قطعتين، هل يمكنني الحصول على خصم؟', 'هل هذا المنتج تالف؟', 'هل لديكم مقاسات أخرى؟', 'أريد استرجاع هذا المنتج.'],
      targetLevel: 5, orderIndex: 9,
    },
    {
      sentenceEn: 'When will this product be available again?',
      correctAr: 'متى سيكون هذا المنتج متوفرًا مرة أخرى؟',
      options: ['متى سيكون هذا المنتج متوفرًا مرة أخرى؟', 'متى يغادر القطار؟', 'متى موعد الامتحان؟', 'متى ينتهي وقت العمل؟'],
      targetLevel: 5, orderIndex: 10,
    },
    // Level 6 — Introductions (advanced)
    {
      sentenceEn: 'How long have you been living here?',
      correctAr: 'منذ متى وأنت تعيش هنا؟',
      options: ['منذ متى وأنت تعيش هنا؟', 'كم عمرك؟', 'من أين أنت؟', 'ما اسمك؟'],
      targetLevel: 6, orderIndex: 11,
    },
    {
      sentenceEn: 'Can you tell me more about yourself?',
      correctAr: 'هل يمكنك أن تخبرني أكثر عن نفسك؟',
      options: ['هل يمكنك أن تخبرني أكثر عن نفسك؟', 'هل يمكنك التحدث ببطء؟', 'هل تتحدث الإنجليزية؟', 'هل أنت هنا لأول مرة؟'],
      targetLevel: 6, orderIndex: 12,
    },
    // Level 7 — Advanced (reserved for hardest)
    {
      sentenceEn: 'I would like the same dish but in a small size.',
      correctAr: 'أريد نفس الطبق لكن بحجم صغير.',
      options: ['أريد نفس الطبق لكن بحجم صغير.', 'أريد طاولة لشخصين.', 'أريد الحساب من فضلك.', 'أريد كوب ماء.'],
      targetLevel: 7, orderIndex: 13,
    },
    {
      sentenceEn: 'How many employees are in this company?',
      correctAr: 'كم عدد الموظفين في هذه الشركة؟',
      options: ['كم عدد الموظفين في هذه الشركة؟', 'كم سعر هذا المنتج؟', 'كم مدة الانتظار؟', 'كم عمرك؟'],
      targetLevel: 7, orderIndex: 14,
    },
    // Extra pool per level (random selection picks 2 of ≥4)
    {
      sentenceEn: 'How much is the fare to the airport?',
      correctAr: 'كم تكلفة التوصيل إلى المطار؟',
      options: ['كم تكلفة التوصيل إلى المطار؟', 'أين تقع محطة الباص الأقرب؟', 'متى يغادر القطار؟', 'أحتاج تذكرة ذهاب وعودة.'],
      targetLevel: 1, orderIndex: 15,
    },
    {
      sentenceEn: 'When does the next train leave?',
      correctAr: 'متى يغادر القطار التالي؟',
      options: ['متى يغادر القطار التالي؟', 'متى موعد الوصول؟', 'أين مكتب التذاكر؟', 'هل يمكنني الدفع بالبطاقة؟'],
      targetLevel: 1, orderIndex: 16,
    },
    {
      sentenceEn: 'I need a doctor quickly.',
      correctAr: 'أحتاج إلى طبيب بسرعة.',
      options: ['أحتاج إلى طبيب بسرعة.', 'أين أقرب مستشفى؟', 'لدي حرارة مرتفعة.', 'أشعر بالدوخة.'],
      targetLevel: 2, orderIndex: 17,
    },
    {
      sentenceEn: 'I have a strong headache.',
      correctAr: 'عندي صداع قوي.',
      options: ['عندي صداع قوي.', 'لدي حساسية من الفول السوداني.', 'أين غرفة الطوارئ؟', 'أحتاج مسكن للألم.'],
      targetLevel: 2, orderIndex: 18,
    },
    {
      sentenceEn: 'What time does work finish?',
      correctAr: 'متى ينتهي وقت العمل؟',
      options: ['متى ينتهي وقت العمل؟', 'متى يبدأ وقت العمل؟', 'لدي اجتماع مهم غدًا.', 'أين غرفة الاجتماعات؟'],
      targetLevel: 3, orderIndex: 19,
    },
    {
      sentenceEn: 'I need to print this file.',
      correctAr: 'أحتاج أن أطبع هذا الملف.',
      options: ['أحتاج أن أطبع هذا الملف.', 'هل يمكنك شرح هذا لي؟', 'أريد أن أقدم عرضًا تقديميًا.', 'أنا مشغول جدًا الآن.'],
      targetLevel: 3, orderIndex: 20,
    },
    {
      sentenceEn: 'The bill, please.',
      correctAr: 'الحساب من فضلك.',
      options: ['الحساب من فضلك.', 'هل يمكن أن يكون الطعام غير حار؟', 'أريد طاولة لشخصين.', 'الطعام لذيذ جدًا.'],
      targetLevel: 4, orderIndex: 21,
    },
    {
      sentenceEn: 'Do you serve desserts?',
      correctAr: 'هل تقدمون حلويات؟',
      options: ['هل تقدمون حلويات؟', 'أعذرني، هذا ليس ما طلبته.', 'القهوة بدون سكر من فضلك.', 'هل يمكنني الدفع بالبطاقة؟'],
      targetLevel: 4, orderIndex: 22,
    },
    {
      sentenceEn: 'How much does this product cost, please?',
      correctAr: 'بكم سعر هذا المنتج من فضلك؟',
      options: ['بكم سعر هذا المنتج من فضلك؟', 'إذا اشتريت قطعتين، هل يمكنني الحصول على خصم؟', 'هل لديكم مقاسات أخرى؟', 'أريد استرجاع هذا المنتج.'],
      targetLevel: 5, orderIndex: 23,
    },
    {
      sentenceEn: 'Can I try this shirt on?',
      correctAr: 'هل يمكنني تجربة هذا القميص؟',
      options: ['هل يمكنني تجربة هذا القميص؟', 'متى سيكون هذا المنتج متوفرًا مرة أخرى؟', 'أين غرفة القياس؟', 'لا أحتاج إلى كيس، شكرًا.'],
      targetLevel: 5, orderIndex: 24,
    },
    {
      sentenceEn: 'What is your name, please?',
      correctAr: 'ما اسمك من فضلك؟',
      options: ['ما اسمك من فضلك؟', 'منذ متى وأنت تعيش هنا؟', 'من أين أنت؟', 'هل تتحدث الإنجليزية؟'],
      targetLevel: 6, orderIndex: 25,
    },
    {
      sentenceEn: 'Could you repeat that, please?',
      correctAr: 'هل يمكنك تكرار ذلك من فضلك؟',
      options: ['هل يمكنك تكرار ذلك من فضلك؟', 'هل يمكنك أن تخبرني أكثر عن نفسك؟', 'ما معنى هذه الكلمة؟', 'أراك لاحقًا.'],
      targetLevel: 6, orderIndex: 26,
    },
    {
      sentenceEn: 'Can we discuss this later?',
      correctAr: 'هل يمكننا مناقشة هذا لاحقًا؟',
      options: ['هل يمكننا مناقشة هذا لاحقًا؟', 'كم عدد الموظفين في هذه الشركة؟', 'أريد نفس الطبق لكن بحجم صغير.', 'هذا موضوع مهم جدًا.'],
      targetLevel: 7, orderIndex: 27,
    },
    {
      sentenceEn: 'I agree with your opinion.',
      correctAr: 'أوافق على رأيك.',
      options: ['أوافق على رأيك.', 'أريد نفس الطبق لكن بحجم صغير.', 'هل يمكنك شرح هذا لي؟', 'متى موعد الامتحان القادم؟'],
      targetLevel: 7, orderIndex: 28,
    },
  ]

  for (const q of questions) {
    await prisma.placementQuestion.create({ data: q })
  }

  console.log(`  ✓ ${questions.length} placement questions seeded`)
}

// ─────────────────────────────────────────
// AI SETTINGS SINGLETON
// ─────────────────────────────────────────

async function seedAISettings() {
  console.log('🤖 Seeding AI settings...')

  await prisma.aISettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      gptModel: 'openai/gpt-4o-mini',
      sttModel: 'whisper-1',
      ttsModel: 'tts-1',
      ttsVoice: 'nova',
      temperature: 0.7,
      systemPrompt: `You are Mujam AI (معجَم), a friendly English conversation tutor for Arabic speakers.
Your goal is to help students practice English in realistic daily situations.
Always be encouraging, patient, and supportive.
Adjust your language complexity based on the student's level (1=beginner, 7=advanced).
Mark grammar corrections using: [CORRECTION: wrong → right]
Mark vocabulary suggestions using: [VOCAB: simpler_word]
Keep responses concise (1-3 sentences for levels 1-3, up to 5 for levels 5-7).
Always end with a follow-up question to keep the conversation going.`,
      correctionStyle: 'balanced',
      formalityLevel: 60,
      monthlyBudgetUsd: 50.0,
    },
    update: {},
  })

  console.log('  ✓ AI settings seeded')
}

// ─────────────────────────────────────────
// AI SCENARIOS — 3 per level (using real level topics)
// ─────────────────────────────────────────

async function seedAIScenarios() {
  console.log('🎭 Seeding AI scenarios...')

  await prisma.aIScenario.deleteMany({})

  const scenarios = [
    // Level 1 — Travel
    {
      levelId: 1, nameAr: 'في المطار', descriptionAr: 'تدرّب على محادثة في مطار دولي', icon: '✈️',
      systemPrompt: 'You are a check-in agent at an international airport. The student is a passenger. Use simple English, max 8 words per sentence. Ask about destination and luggage.',
      openingMessage: 'Good morning! Welcome to the check-in desk. May I see your passport, please?'
    },
    {
      levelId: 1, nameAr: 'في التاكسي', descriptionAr: 'تدرّب على التحدث مع سائق التاكسي', icon: '🚕',
      systemPrompt: 'You are a taxi driver. The student needs to get somewhere. Use simple daily English. Ask about destination and help with directions.',
      openingMessage: 'Hello! Where would you like to go today?'
    },
    {
      levelId: 1, nameAr: 'في محطة القطار', descriptionAr: 'تدرّب على شراء تذكرة القطار', icon: '🚆',
      systemPrompt: 'You are a ticket office agent at a train station. Help the student buy tickets. Use simple English about destinations and ticket types.',
      openingMessage: 'Hello! How can I help you today? Where would you like to travel?'
    },

    // Level 2 — Hospital
    {
      levelId: 2, nameAr: 'عند الطبيب', descriptionAr: 'تدرّب على محادثة مع الطبيب', icon: '👨‍⚕️',
      systemPrompt: 'You are a doctor in a clinic. The student is a patient. Ask about symptoms using simple English. Be professional and caring.',
      openingMessage: "Good morning! Please have a seat. What brings you in today? How can I help you?"
    },
    {
      levelId: 2, nameAr: 'في الصيدلية', descriptionAr: 'تدرّب على طلب الدواء من الصيدلية', icon: '💊',
      systemPrompt: 'You are a pharmacist. The student needs medication. Use simple English about medicines, dosage, and allergies.',
      openingMessage: 'Hello! Welcome to the pharmacy. How can I help you today?'
    },
    {
      levelId: 2, nameAr: 'في غرفة الطوارئ', descriptionAr: 'تدرّب على التحدث في حالة الطوارئ', icon: '🚨',
      systemPrompt: 'You are an emergency room nurse. The student needs urgent help. Use clear, simple English. Ask about the emergency and symptoms.',
      openingMessage: "Emergency room, how can I help you? What's the emergency?"
    },

    // Level 3 — Work & School
    {
      levelId: 3, nameAr: 'مقابلة عمل', descriptionAr: 'تدرّب على مقابلة عمل باللغة الإنجليزية', icon: '💼',
      systemPrompt: 'You are a hiring manager at a company. Conduct a professional job interview. Ask about experience, skills, and motivation. Use professional English appropriate for level 3.',
      openingMessage: 'Hello! Thank you for coming in today. Please have a seat. Can you start by telling me a little about yourself?'
    },
    {
      levelId: 3, nameAr: 'في الاجتماع', descriptionAr: 'تدرّب على المشاركة في اجتماع عمل', icon: '📊',
      systemPrompt: 'You are a colleague in a work meeting. Discuss a project or work topic. Use professional but accessible English for level 3 students.',
      openingMessage: "Good morning everyone! Let's start the meeting. Can you give us a quick update on the project?"
    },
    {
      levelId: 3, nameAr: 'في الفصل الدراسي', descriptionAr: 'تدرّب على التحدث مع الأستاذ', icon: '📚',
      systemPrompt: 'You are a university professor. The student wants help with coursework. Use academic English appropriate for level 3.',
      openingMessage: 'Hello! Come in. What can I help you with today? Do you have a question about the course?'
    },

    // Level 4 — Restaurant
    {
      levelId: 4, nameAr: 'في مطعم راقٍ', descriptionAr: 'تدرّب على طلب الطعام في مطعم', icon: '🍽️',
      systemPrompt: 'You are a waiter at an upscale restaurant. Take the student\'s order, answer questions about the menu, and provide excellent service. Use polite restaurant English.',
      openingMessage: "Good evening! Welcome to La Maison. My name is James and I'll be your server tonight. Can I start you off with something to drink?"
    },
    {
      levelId: 4, nameAr: 'طلب طعام للتوصيل', descriptionAr: 'تدرّب على طلب الطعام عبر الهاتف', icon: '📱',
      systemPrompt: 'You are a restaurant phone operator taking a delivery order. Ask about the order, address, and payment. Use clear and simple English.',
      openingMessage: "Hello! Thank you for calling Pizza Palace. Can I take your order?"
    },
    {
      levelId: 4, nameAr: 'في كافيه', descriptionAr: 'تدرّب على طلب القهوة في كافيه', icon: '☕',
      systemPrompt: 'You are a barista at a coffee shop. Help the student order drinks. Explain menu options using simple English.',
      openingMessage: "Hi there! Welcome to The Coffee Corner. What can I get for you today?"
    },

    // Level 5 — Shopping
    {
      levelId: 5, nameAr: 'في محل الملابس', descriptionAr: 'تدرّب على التسوق في محل ملابس', icon: '👕',
      systemPrompt: 'You are a sales assistant at a clothing store. Help the student find clothes, sizes, and colors. Use everyday shopping English.',
      openingMessage: "Hello! Welcome to our store. Are you looking for something specific today? Can I help you find anything?"
    },
    {
      levelId: 5, nameAr: 'في السوبرماركت', descriptionAr: 'تدرّب على التسوق في السوبرماركت', icon: '🛒',
      systemPrompt: 'You are a supermarket employee. Help the student find products, check prices, and navigate the store.',
      openingMessage: "Hi! Welcome to FreshMart. Are you looking for something in particular? I can help you find it."
    },
    {
      levelId: 5, nameAr: 'استرجاع منتج', descriptionAr: 'تدرّب على استرجاع أو تبديل منتج', icon: '🔄',
      systemPrompt: 'You are a customer service representative at a store. Handle a product return or exchange. Use professional but simple English.',
      openingMessage: "Hello! Welcome to our customer service desk. How can I assist you today?"
    },

    // Level 6 — Introductions
    {
      levelId: 6, nameAr: 'التعارف في حفلة', descriptionAr: 'تدرّب على التعارف مع أشخاص جدد', icon: '🎉',
      systemPrompt: 'You are a friendly person at a social gathering. Help the student practice introductions, small talk, and getting to know new people.',
      openingMessage: "Hi there! I don't think we've met before. I'm Sarah. What's your name?"
    },
    {
      levelId: 6, nameAr: 'محادثة مع جار جديد', descriptionAr: 'تدرّب على التعارف مع جار جديد', icon: '🏠',
      systemPrompt: 'You are a friendly neighbor meeting the student for the first time. Have a casual neighborly conversation using everyday English.',
      openingMessage: "Oh hello! Are you the new neighbor? Welcome to the building! I'm Tom. How are you settling in?"
    },
    {
      levelId: 6, nameAr: 'في تجمع عائلي', descriptionAr: 'تدرّب على التحدث في تجمع اجتماعي', icon: '👨‍👩‍👧‍👦',
      systemPrompt: 'You are a friendly person at a family or social gathering. Practice general conversation, asking about family, hobbies, and plans.',
      openingMessage: "Hello! So nice to see you here! How have you been? What have you been up to lately?"
    },
  ]

  for (const scenario of scenarios) {
    await prisma.aIScenario.create({ data: scenario })
  }

  console.log(`  ✓ ${scenarios.length} AI scenarios seeded`)
}

// ─────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────

async function seedAchievements() {
  console.log('🏆 Seeding achievements...')

  const achievements = [
    { key: 'first_sentence', nameAr: 'أول خطوة', icon: '👶', descAr: 'أكملت أول جملة في معجَم', condition: { type: 'sentences', value: 1 } },
    { key: 'sentences_50', nameAr: '٥٠ جملة', icon: '📚', descAr: 'أتممت تعلم 50 جملة', condition: { type: 'sentences', value: 50 } },
    { key: 'sentences_100', nameAr: 'مئة جملة', icon: '📚', descAr: 'أتممت تعلم 100 جملة', condition: { type: 'sentences', value: 100 } },
    { key: 'sentences_175', nameAr: 'جمل المعجم كاملة', icon: '🎓', descAr: 'أتممت تعلم جميع الجمل', condition: { type: 'sentences', value: 175 } },
    { key: 'streak_7', nameAr: 'أسبوع متواصل', icon: '🔥', descAr: 'درّست 7 أيام متتالية', condition: { type: 'streak', value: 7 } },
    { key: 'streak_30', nameAr: 'شهر متواصل', icon: '🔥', descAr: 'درّست 30 يومًا متتاليًا', condition: { type: 'streak', value: 30 } },
    { key: 'streak_100', nameAr: 'مئة يوم', icon: '💎', descAr: 'درّست 100 يوم متتالياً', condition: { type: 'streak', value: 100 } },
    { key: 'level_1', nameAr: 'بداية الرحلة', icon: '⭐', descAr: 'أكملت المستوى الأول', condition: { type: 'level_complete', value: 1 } },
    { key: 'level_3', nameAr: 'في المنتصف', icon: '⭐', descAr: 'أكملت المستوى الثالث', condition: { type: 'level_complete', value: 3 } },
    { key: 'level_7', nameAr: 'إتقان المعجم', icon: '👑', descAr: 'أكملت جميع المستويات السبعة', condition: { type: 'level_complete', value: 7 } },
    { key: 'first_ai', nameAr: 'أول محادثة', icon: '🤖', descAr: 'أجريت أول محادثة مع الذكاء الاصطناعي', condition: { type: 'ai_sessions', value: 1 } },
    { key: 'ai_10', nameAr: 'محاور نشط', icon: '🎙️', descAr: 'أجريت 10 محادثات مع الذكاء الاصطناعي', condition: { type: 'ai_sessions', value: 10 } },
    { key: 'first_shadow', nameAr: 'أول تظليل', icon: '🎵', descAr: 'أكملت أول قصة شادونج', condition: { type: 'shadowing_complete', value: 1 } },
    { key: 'top_3', nameAr: 'من الأفضل', icon: '🏆', descAr: 'وصلت للمراكز الثلاثة الأولى', condition: { type: 'leaderboard_rank', value: 3 } },
  ]

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      create: achievement,
      update: achievement,
    })
  }

  console.log(`  ✓ ${achievements.length} achievements seeded`)
}

// ─────────────────────────────────────────
// PLATFORM SETTINGS SINGLETON
// ─────────────────────────────────────────

async function seedPlatformSettings() {
  console.log('⚙️ Seeding platform settings...')

  await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      platformName: 'معجَم',
      supportEmail: 'support@mujam.com',
      maintenanceMode: false,
      freeAiLimit: 3,
      freeLevelsCount: 2,
      premiumMonthlyPrice: 9.99,
      premiumYearlyPrice: 7.99,
      trialDays: 7,
      featureFlags: {
        shadowing: true,
        aiConversation: true,
        leaderboard: true,
        referral: true,
        blog: true,
        betaFeatures: false,
      },
    },
    update: {},
  })

  console.log('  ✓ Platform settings seeded')
}

// ─────────────────────────────────────────
// NEWS BANNERS (learner NewsBar via GET /api/news-banners)
// ─────────────────────────────────────────

async function seedNewsBanners() {
  console.log('📢 Seeding news banners...')

  const banners = [
    {
      id: 'seed-news-daily-path',
      messageAr: 'جديد: جرّب مسار اليوم · تحدي التحدث الأسبوعي · تقرير الوالدين',
      linkUrl: '/dashboard#daily-path',
      isActive: true,
      orderIndex: 0,
      bgColor: null as string | null,
      textColor: null as string | null,
    },
    {
      id: 'seed-news-weekly',
      messageAr: 'تحدي التحدث الأسبوعي — سجّل محاولتك وارفع مستواك',
      linkUrl: '/dashboard#weekly-challenge',
      isActive: true,
      orderIndex: 1,
      bgColor: null as string | null,
      textColor: null as string | null,
    },
    {
      id: 'seed-news-parents',
      messageAr: 'تقرير الوالدين لمتابعة تقدّم الأطفال',
      linkUrl: '/kids/parent',
      isActive: true,
      orderIndex: 2,
      bgColor: null as string | null,
      textColor: null as string | null,
    },
  ]

  for (const banner of banners) {
    await prisma.newsBanner.upsert({
      where: { id: banner.id },
      create: banner,
      // Do not overwrite admin edits after first insert
      update: {},
    })
  }

  console.log(`  ✓ ${banners.length} news banners seeded`)
}

async function seedCommunityRooms() {
  console.log('💬 Seeding community rooms...')

  const rooms = [
    { name: 'General Community', nameAr: 'المجتمع العام', icon: '💬', type: 'PUBLIC' as const, isDefault: true },
    { name: 'Conversation Practice', nameAr: 'تدريب المحادثة', icon: '🗣️', type: 'PRACTICE' as const, isDefault: true },
    { name: 'Questions & Answers', nameAr: 'الأسئلة والأجوبة', icon: '❓', type: 'QA' as const, isDefault: true },
  ]

  for (const room of rooms) {
    await prisma.communityRoom.upsert({
      where: { id: room.name.toLowerCase().replace(/\s+/g, '-') },
      update: { type: room.type },
      create: { id: room.name.toLowerCase().replace(/\s+/g, '-'), ...room },
    })
  }

  console.log(`  ✓ ${rooms.length} community rooms seeded`)
}

// ─────────────────────────────────────────
// SHADOWING STORIES
// ─────────────────────────────────────────

async function seedShadowingStories() {
  console.log('🎙️ Seeding shadowing stories...')

  const stories = [
    {
      levelId: 1,
      titleAr: 'في المطار',
      titleEn: 'At the Airport',
      fullText: 'Hello. I need to check in for my flight to London. Here is my passport. Do you have any bags to check? Yes, I have one suitcase. Please place it on the scale. Your bag is within the weight limit. Here is your boarding pass. Your gate is B12. Boarding starts at 3 PM. Thank you very much.',
      orderIndex: 1,
    },
    {
      levelId: 2,
      titleAr: 'في المستشفى',
      titleEn: 'At the Hospital',
      fullText: 'Good morning doctor. I am not feeling well. I have a fever and a headache. How long have you had these symptoms? For about three days. Let me check your temperature. You have a high fever. I will prescribe some medicine for you. Take this twice a day. Thank you doctor.',
      orderIndex: 1,
    },
    {
      levelId: 4,
      titleAr: 'في المطعم',
      titleEn: 'At the Restaurant',
      fullText: 'Good evening. Table for two please. Follow me please. Here is your table. Can I see the menu? Of course. Here you are. What would you like to order? I will have the grilled chicken with rice. And for you sir? I will have the fish with vegetables. Anything to drink? Two glasses of water please. Your order will be ready soon.',
      orderIndex: 1,
    },
    {
      levelId: 3,
      titleAr: 'في المكتب',
      titleEn: 'At the Office',
      fullText: 'Good morning everyone. Let us start the meeting. We need to discuss the new project. John, can you give us an update? Yes, we have completed the first phase. The team is working on the second phase now. When will it be finished? We expect to finish by next Friday. That sounds good. Please keep me updated. Thank you everyone.',
      orderIndex: 1,
    },
    {
      levelId: 5,
      titleAr: 'التسوق',
      titleEn: 'Shopping',
      fullText: 'Excuse me, do you have this shirt in a medium size? Let me check for you. Yes, we have it in medium. Can I try it on? Of course, the fitting room is over there. This fits perfectly. How much is it? It is fifty dollars. Do you accept credit cards? Yes, we do. Here is your receipt. Thank you for shopping with us.',
      orderIndex: 1,
    },
  ]

  for (const story of stories) {
    const existing = await prisma.story.findFirst({
      where: { levelId: story.levelId, orderIndex: story.orderIndex },
    })

    if (existing) {
      // Update text/titles but preserve audioUrl and wordsTiming
      await prisma.story.update({
        where: { id: existing.id },
        data: {
          titleAr: story.titleAr,
          titleEn: story.titleEn,
          fullText: story.fullText,
        },
      })
    } else {
      await prisma.story.create({ data: story })
    }
  }

  console.log(`  ✓ ${stories.length} shadowing stories seeded`)
}

// ─────────────────────────────────────────
// QUIZZES
// ─────────────────────────────────────────

async function seedQuizzes() {
  console.log('📝 Seeding quizzes...')

  await prisma.userQuizAttempt.deleteMany({})
  await prisma.quizQuestion.deleteMany({})
  await prisma.levelQuiz.deleteMany({})
  for (let levelId = 1; levelId <= 10; levelId++) {
    const quiz = await prisma.levelQuiz.create({
      data: {
        levelId,
        passScore: 70,
        maxAttempts: 3,
        timeLimit: 600,
      },
    })
    // Fetch sentences for this level to create audio questions
    const levelSentences = await prisma.sentence.findMany({
      where: { levelId },
      orderBy: { orderIndex: 'asc' },
      take: 12,
    })

    if (levelSentences.length === 0) {
      continue
    }

    // Add mixed questions for each quiz
    const questions = [];

    const questionCount = 8
    for (let i = 0; i < questionCount; i++) {
      const sentence = levelSentences[i % levelSentences.length]

      if (i % 2 === 0) {
        // Standard Multiple Choice
        questions.push({
          quizId: quiz.id,
          type: 'MULTIPLE_CHOICE' as const,
          questionData: {
            question: `ما معنى: "${sentence.textEn}"؟`,
            options: [sentence.textAr, 'خيار خاطئ 1', 'خيار خاطئ 2', 'خيار خاطئ 3'].sort(() => Math.random() - 0.5),
          },
          correctAnswer: sentence.textAr,
          points: 15,
          orderIndex: i + 1,
        })
      } else {
        // Audio Match (Listen and choose correct text)
        questions.push({
          quizId: quiz.id,
          type: 'AUDIO_MATCH' as const,
          sentenceId: sentence.id,
          questionData: {
            question: 'استمع واختر الجملة الصحيحة:',
            options: [sentence.textEn, 'Wrong sentence 1', 'Wrong sentence 2', 'Wrong sentence 3'].sort(() => Math.random() - 0.5),
            audioUrl: sentence.audioUrlNormal,
          },
          correctAnswer: sentence.textEn,
          points: 15,
          orderIndex: i + 1,
        })
      }
    }

    await prisma.quizQuestion.createMany({ data: questions })
  }

  console.log(`  ✓ Quizzes seeded for levels 1–10 (8 أسئلة لكل اختبار)`)
}

// ─────────────────────────────────────────
// GAMES
// ─────────────────────────────────────────

/** Heuristic Arabic tips for sentences not covered by curated Part 5 markdown lists. */
function inferGrammarTipsForSentence(textEn: string): {
  grammarTipAr: string
  grammarCategory: string
  pronounTipAr?: string | null
} {
  const t = textEn.trim()
  const low = t.toLowerCase()

  const pick = (
    grammarTipAr: string,
    grammarCategory: string,
    pronounTipAr?: string | null
  ) => ({ grammarTipAr, grammarCategory, pronounTipAr: pronounTipAr ?? undefined })

  if (/\bdon'?t\b|\bdoesn'?t\b|\bdidn'?t\b|\bisn'?t\b|\baren't\b|\bnot\b|^no,\s/i.test(low)) {
    return pick(
      '📌 هذه الجملة تحتوي نفيًا أو ردَّ نفي: لا تنسَ أن النفي الصحيح يعتمد على زمن الفعل ونوعه.',
      'negation'
    )
  }

  if (/^(what|which|whose)\b/i.test(low)) {
    return pick(
      '📌 سؤال بـ What/Which عن شيء أو خيار. ترتيب السؤال: كلمة السؤال + مساعد + فاعل + فعل.',
      'question'
    )
  }

  if (/^(where|when|why|who|how)\b/i.test(low)) {
    const w = (/^(how)\b/i.exec(t)?.[1] ?? 'Wh-').toLowerCase()
    return pick(
      `📌 سؤال بـ "${w.charAt(0).toUpperCase() + w.slice(1)}". كلمات Wh- للتفاصيل، غالبًا تُليها فعل مساعد ثم الفاعل.`,
      'question'
    )
  }

  if (/^(is|are|was|were|do|does|did|have|has|had|can|could|would|will|may|might|should)\b/i.test(low) && /\?/.test(t)) {
    return pick(
      '📌 سؤال تركيب Yes/No: نبدأ بفعل مساعد (Do/Is/Can…) ثم الفاعل ثم المعنى.',
      'question'
    )
  }

  if (/\?$/.test(t) && /\b(can|could|would|may)\s+i\b/i.test(low)) {
    return pick(
      '📌 "Can/Could/May + I …?" للطلب الإذن أو المساعدة بأسلوب مهذّب.',
      'question'
    )
  }

  if (/\?$/.test(t) && /^can\s+you\b/i.test(low)) {
    return pick(
      '📌 "Can you …?" للطلب المباشر بأسلوب مهذّب قبل المفعول أو الفعل.',
      'verb',
      '👤 You = مخاطَب'
    )
  }

  if (/\bwould\s+you\s+like\b|\bi'?d\s+like\b|\bi\s+would\s+like\b/i.test(low)) {
    return pick(
      '📌 التعبير بأسلوب مهذّب عن الرغبة: would like أكثر تأدبًا من want في الطلبات.',
      'verb'
    )
  }

  if (/\bi'?ll\b|\bi\s+will\b|\bwill\s+you\b/i.test(low)) {
    return pick(
      '📌 "will" للمستقبل القريب وللقرارات في اللحظة.',
      'tense'
    )
  }

  if (/\bye(s|ted|ing)\b|^see you\b|^goodbye|^good morning|^good evening/i.test(low)) {
    return pick(
      '📌 جمل تعارف وأحوال ثابتة — احفظ الصيغة كما هي؛ بعضها مخفّض في المحادثة.',
      'structure'
    )
  }

  if (/\blet'?s\b|\blet\s+us\b/i.test(low)) {
    return pick(
      '📌 "Let\'s" = دعنا + فعل؛ اقتراح مشترك مهذّب.',
      'structure'
    )
  }

  if (/\bknow\b.*\bhim\b|\bhim\b.*\bknow\b/i.test(low)) {
    return pick(
      '📌 بعد بعض الأفعال الكشف عن الشّخص يأتي ضمير مفعول به: him/her/them وليس he/she.',
      'pronoun',
      '👤 him = ضمير مفعول به'
    )
  }

  if (/\bi\s+(am|'m)\b|^i'm\b/i.test(low)) {
    return pick(
      '📌 "I am / I\'m" مع صفات أو مهنة للتعبير عن الحالة أو الهوية.',
      'pronoun',
      '👤 I — مع am فقط في المضارع'
    )
  }

  if (/\bi\s+(have|had|got)\b|^i'?ve\b/i.test(low)) {
    return pick(
      '📌 "I have" للوجود وللحالة الجسدية كثيرًا — مع I لا تُضاف s للـ have.',
      'verb',
      '👤 I'
    )
  }

  if (/\b(your|his|her|their|our|my)\s+\w+/i.test(low)) {
    return pick(
      '📌 ضمائر الملكية (my/your…) تسبق الاسم مباشرة دون اسم إضافة منفصل.',
      'pronoun'
    )
  }

  if (/\b(he|she|they|we|it)\s+(is|are|was|were|has|have|needs?|works?)\b/i.test(low)) {
    return pick(
      '📌 مع الجموع/third person انتبه لاتفاق الفعل: has مع he/she/it و have مع they/we/I.',
      'tense'
    )
  }

  if (/^(this|that|these|those)\s/i.test(low)) {
    return pick(
      '📌 this/these للقُرب، that/those للبُعد؛ تتّفق مع الجمع في these/those.',
      'structure'
    )
  }

  if (/\?$/.test(t) && /\bhow\s+many\b|\bhow\s+much\b/i.test(low)) {
    return pick(
      '📌 How much للكم غير المعدودة / السعر، How many بعدد الأشياء المعدودة.',
      'question'
    )
  }

  if (/\bneed\s+to\s+\w+/i.test(low)) {
    return pick(
      '📌 "need to + مصدر" تعبير عن ضرورة أو يجب أن؛ الفعل يبقى بصيغة المصدر بعد to.',
      'verb'
    )
  }

  if (/\bwant\s+to\s+/i.test(low)) {
    return pick(
      '📌 "want to + مصدر" للرغبة في فعل؛ لا تصرف الفعل الثاني.',
      'verb'
    )
  }

  if (/\b(go|went|going|come|came)\b/i.test(low)) {
    return pick(
      '📌 أفعال الحركة تُستخدم كثيرًا في السفر؛ لاحظ go/went وفروق الزمن بين المضارع والماضي.',
      'verb'
    )
  }

  if (/\?\s*$/.test(t)) {
    return pick(
      '📌 جملة استفهام — راقب ترتيب الأدوات المساعدة والفاعل مقارنةً بالإخبارية.',
      'question'
    )
  }

  return pick(
    '📌 جملة تعبير عن موقف واقعي؛ راقب ترتيب فاعل + فعل ومطابقة الفعل مع الفاعل في المضارع البسيط.',
    'structure'
  )
}

async function seedGames() {
  console.log('🎮 Seeding games...')

  await prisma.userGameProgress.deleteMany({})
  await prisma.gameQuestion.deleteMany({})
  await prisma.game.deleteMany({})

  const QUESTIONS_PER_GAME = 32

  const gameConfigsSentence = [
    { type: Difficulty.EASY, titleAr: 'سهل ١', index: 1 },
    { type: Difficulty.MEDIUM, titleAr: 'متوسط ١', index: 2 },
    { type: Difficulty.HARD, titleAr: 'صعب ١', index: 3 },
    { type: Difficulty.EASY, titleAr: 'سهل ٢', index: 4 },
    { type: Difficulty.MEDIUM, titleAr: 'متوسط ٢', index: 5 },
    { type: Difficulty.HARD, titleAr: 'صعب ٢', index: 6 },
    { type: Difficulty.MEDIUM, titleAr: 'مراجعة ١', index: 7 },
    { type: Difficulty.HARD, titleAr: 'تحدي المراجعة', index: 8 },
  ]

  for (let levelId = 1; levelId <= 10; levelId++) {
    const sentences = await prisma.sentence.findMany({
      where: { levelId },
      orderBy: { orderIndex: 'asc' },
    })

    if (sentences.length === 0) continue

    for (const diff of gameConfigsSentence) {
      const game = await prisma.game.create({
        data: {
          levelId,
          type: GameType.MIXED,
          titleAr: `${diff.titleAr} — المستوى ${levelId}`,
          difficulty: diff.type,
          orderIndex: diff.index,
        },
      })

      for (let i = 0; i < QUESTIONS_PER_GAME; i++) {
        const sentence = sentences[i % sentences.length]
        const questionType = [GameType.DRAG_DROP, GameType.MULTIPLE_CHOICE, GameType.FILL_BLANK][i % 3]

        let questionData: Record<string, unknown> = {}
        let correctAnswer = ''

        if (questionType === GameType.DRAG_DROP) {
          const words = sentence.textEn.split(/\s+/)
          questionData = {
            sentenceEn: sentence.textEn,
            words: [...words].sort(() => Math.random() - 0.5),
            correctOrder: words,
          }
          correctAnswer = JSON.stringify(words)
        } else if (questionType === GameType.MULTIPLE_CHOICE) {
          const distractors = sentences
            .filter((s) => s.id !== sentence.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map((s) => s.textAr)

          const options = [sentence.textAr, ...distractors].sort(() => Math.random() - 0.5)

          questionData = {
            question: `How do you say "${sentence.textEn}" in Arabic?`,
            options,
          }
          correctAnswer = sentence.textAr
        } else {
          const words = sentence.textEn.split(/\s+/)
          const blankIndex = Math.floor(Math.random() * words.length)
          const blankWord = words[blankIndex]
          words[blankIndex] = '___'

          questionData = {
            question: words.join(' '),
            hint: sentence.textAr,
          }
          correctAnswer = blankWord
        }

        await prisma.gameQuestion.create({
          data: {
            gameId: game.id,
            sentenceId: sentence.id,
            type: questionType,
            questionData: questionData as Prisma.InputJsonValue,
            correctAnswer,
            orderIndex: i + 1,
          },
        })
      }
    }
  }

  // Grammar practice levels (examples from GrammarRule JSON; sentenceId omitted)
  const grammarLevelIds = [11, 12, 13]
  const gameConfigsGrammar = [
    { type: Difficulty.EASY, titleAr: '📘 قواعد — سهل ١', index: 1 },
    { type: Difficulty.MEDIUM, titleAr: '📘 قواعد — متوسط ١', index: 2 },
    { type: Difficulty.HARD, titleAr: '📘 قواعد — صعب ١', index: 3 },
    { type: Difficulty.EASY, titleAr: '📘 قواعد — سهل ٢', index: 4 },
    { type: Difficulty.MEDIUM, titleAr: '📘 قواعد — متوسط ٢', index: 5 },
    { type: Difficulty.HARD, titleAr: '📘 قواعد — صعب ٢', index: 6 },
    { type: Difficulty.MEDIUM, titleAr: '📘 قواعد — مراجعة', index: 7 },
    { type: Difficulty.HARD, titleAr: '📘 قواعد — تحدي', index: 8 },
  ]

  const genericWrongAr = [
    'تعبير مختلف عن المعنى المطلوب',
    'صياغة عامة وليست الترجمة الدقيقة',
    'اختصار خطأ في المعنى',
  ]

  for (const levelId of grammarLevelIds) {
    const rules = await prisma.grammarRule.findMany({
      where: { levelId, isActive: true },
      orderBy: { orderIndex: 'asc' },
    })

    const pool: { en: string; ar: string }[] = []
    for (const rule of rules) {
      const ex = rule.examples
      if (Array.isArray(ex)) {
        for (const item of ex) {
          if (
            item &&
            typeof item === 'object' &&
            'en' in item &&
            'ar' in item
          ) {
            const enStr = String((item as { en: unknown }).en).trim()
            const arStr = String((item as { ar: unknown }).ar).trim()
            if (enStr.length > 2 && arStr.length > 1) {
              pool.push({ en: enStr, ar: arStr })
            }
          }
        }
      }
    }

    if (pool.length === 0) continue

    const allArabic = [...new Set(pool.map((p) => p.ar))]

    const pickDistractors = (correctAr: string) => {
      const picks = allArabic.filter((x) => x !== correctAr).sort(() => Math.random() - 0.5)
      const chosen = picks.slice(0, 3)
      while (chosen.length < 3) {
        const g = genericWrongAr[chosen.length % genericWrongAr.length]
        if (!chosen.includes(g)) chosen.push(g)
      }
      return chosen
    }

    for (const diff of gameConfigsGrammar) {
      const game = await prisma.game.create({
        data: {
          levelId,
          type: GameType.MIXED,
          titleAr: `${diff.titleAr}`,
          difficulty: diff.type,
          orderIndex: diff.index,
        },
      })

      for (let i = 0; i < QUESTIONS_PER_GAME; i++) {
        const pair = pool[i % pool.length]
        const questionType = [GameType.MULTIPLE_CHOICE, GameType.FILL_BLANK, GameType.DRAG_DROP][i % 3]

        let questionData: Record<string, unknown> = {}
        let correctAnswer = ''
        let resolvedType: GameType = questionType

        if (questionType === GameType.MULTIPLE_CHOICE) {
          const distractors = pickDistractors(pair.ar)
          const options = [pair.ar, ...distractors].sort(() => Math.random() - 0.5)

          questionData = {
            question: `اختر العربية المناسبة لـ: "${pair.en}"`,
            options,
          }
          correctAnswer = pair.ar
        } else if (questionType === GameType.FILL_BLANK) {
          const words = pair.en.split(/\s+/)
          if (words.length < 2) {
            resolvedType = GameType.MULTIPLE_CHOICE
            const distractors = pickDistractors(pair.ar)
            const options = [pair.ar, ...distractors].sort(() => Math.random() - 0.5)
            questionData = {
              question: `اختر الترجمة: "${pair.en}"`,
              options,
            }
            correctAnswer = pair.ar
          } else {
            const blankIndex = Math.floor(Math.random() * words.length)
            const blankWord = words[blankIndex]
            words[blankIndex] = '___'

            questionData = {
              question: words.join(' '),
              hint: pair.ar,
            }
            correctAnswer = blankWord
          }
        } else {
          const words = pair.en.split(/\s+/)
          if (words.length < 3) {
            resolvedType = GameType.MULTIPLE_CHOICE
            const distractors = pickDistractors(pair.ar)
            const options = [pair.ar, ...distractors].sort(() => Math.random() - 0.5)
            questionData = {
              question: `اختر الترجمة: "${pair.en}"`,
              options,
            }
            correctAnswer = pair.ar
          } else {
            questionData = {
              sentenceEn: pair.en,
              words: [...words].sort(() => Math.random() - 0.5),
              correctOrder: words,
            }
            correctAnswer = JSON.stringify(words)
          }
        }

        await prisma.gameQuestion.create({
          data: {
            gameId: game.id,
            sentenceId: null,
            type: resolvedType,
            questionData: questionData as Prisma.InputJsonValue,
            correctAnswer,
            orderIndex: i + 1,
          },
        })
      }
    }
  }

  console.log(
    '  ✓ Games: thematic levels → 8 games × '
      + QUESTIONS_PER_GAME
      + ' أسئلة؛ مستويات القواعد 11–13 → ألعاب من أمثلة القواعد'
  )
}

// ─────────────────────────────────────────
// SUPER ADMIN USER
// ─────────────────────────────────────────

async function seedSuperAdmin() {
  console.log('👑 Seeding super admin...')

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@mujam.com'
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'changeme_immediately_123!'

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    console.log('  ✓ Super admin already exists, skipping')
    return
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      plan: SubscriptionPlan.PREMIUM,
      emailVerified: true,
      currentLevel: 7,
    }
  })

  console.log(`  ✓ Super admin created: ${adminEmail}`)
  console.log(`  ⚠️  Change the password immediately after first login!`)
}

// ─────────────────────────────────────────
// GRAMMAR TIPS (match sentences by textEn)
// ─────────────────────────────────────────

async function seedGrammarTips() {
  console.log('📖 Seeding grammar tips on sentences...')

  const grammarUpdates: {
    textEn: string
    grammarTipAr?: string
    grammarTipEn?: string
    pronounTipAr?: string
    grammarCategory?: string
    difficultyNote?: string
  }[] = [
    { textEn: 'Where is the nearest bus station?', grammarTipAr: '📌 "Where is" تُستخدم للسؤال عن مكان شيء واحد. المفرد دائمًا "is" وليس "are".', grammarCategory: 'question' },
    { textEn: 'I need a taxi, please.', grammarTipAr: '📌 الضمير "I" = أنا. الفعل "need" لا يأخذ "s" مع I — نقول "I need" وليس "I needs".', pronounTipAr: '👤 I = أنا (ضمير المتكلم)', grammarCategory: 'pronoun' },
    { textEn: 'How much is the fare to the airport?', grammarTipAr: '📌 "How much" للسؤال عن السعر أو الكمية غير المعدودة. "How many" للأشياء المعدودة.', grammarCategory: 'question' },
    { textEn: 'Can you take me to this address?', grammarTipAr: '📌 "Can you...?" طريقة مؤدبة لطلب شيء. أقوى من "Please" وأكثر استخدامًا يوميًا.', pronounTipAr: '👤 You = أنت / أنتم (ضمير المخاطب)', grammarCategory: 'verb' },
    { textEn: 'How far is this place from here?', grammarTipAr: '📌 "How far" للسؤال عن المسافة. "How long" للسؤال عن الوقت.', grammarCategory: 'question' },
    { textEn: 'How long does it take to get there?', grammarTipAr: '📌 "does it take" — نستخدم "does" مع he/she/it في المضارع البسيط.', pronounTipAr: '👤 It = هو/هي للأشياء وليس للأشخاص', grammarCategory: 'tense' },
    { textEn: 'Stop here, please.', grammarTipAr: '📌 الأمر المباشر: نبدأ بالفعل مباشرة بدون ضمير. "Stop" وليس "You stop".', grammarCategory: 'structure' },
    { textEn: 'When does the next train leave?', grammarTipAr: '📌 "does" في السؤال مع المضارع البسيط. الترتيب: When + does + الفاعل + الفعل الأصلي.', grammarCategory: 'question' },
    { textEn: 'I need a one-way ticket.', grammarTipAr: '📌 "a" قبل الاسم المفرد الذي يبدأ بحرف ساكن. "an" قبل الاسم الذي يبدأ بحرف متحرك.', grammarCategory: 'structure' },
    { textEn: 'I am lost, can you help me?', grammarTipAr: '📌 "I am" = أنا + فعل الكون. اختصاره "I\'m". استخدمه للتعبير عن الحالة.', pronounTipAr: '👤 Me = إياي (ضمير المفعول به للمتكلم)', grammarCategory: 'pronoun' },
    { textEn: 'I need a doctor quickly.', grammarTipAr: '📌 "quickly" ظرف حال — يصف كيف تحتاج الطبيب. الظروف عادةً تنتهي بـ "ly".', grammarCategory: 'structure' },
    { textEn: 'I have severe pain in my stomach.', grammarTipAr: '📌 "I have" للتعبير عن الملكية أو الحالة الجسدية. "have" لا تأخذ "s" مع I.', pronounTipAr: '👤 My = ضمير الملكية للمتكلم (مثل: my bag, my name)', grammarCategory: 'pronoun' },
    { textEn: 'I feel dizzy.', grammarTipAr: '📌 "feel" فعل للتعبير عن المشاعر والإحساس الجسدي. يأتي بعده صفة مباشرة.', grammarCategory: 'verb' },
    { textEn: 'I cannot breathe well.', grammarTipAr: '📌 "cannot" = can + not. اختصاره "can\'t". يعبر عن عدم القدرة.', grammarCategory: 'negation' },
    { textEn: 'I am allergic to peanuts.', grammarTipAr: '📌 "allergic to" — حساسية من. لاحظ أن "to" دائمًا تأتي بعد allergic.', grammarCategory: 'structure' },
    { textEn: 'Can I get a prescription?', grammarTipAr: '📌 "Can I...?" للطلب المؤدب. أكثر استخدامًا من "May I" في المحادثة اليومية.', grammarCategory: 'question' },
    { textEn: 'Do I need to stay in the hospital?', grammarTipAr: '📌 "Do I need to...?" السؤال عن الضرورة. "need to" + فعل الأصل.', grammarCategory: 'question' },
    { textEn: 'I am not feeling better.', grammarTipAr: '📌 النفي مع فعل الكون: am + not. "I am not" = I\'m not.', grammarCategory: 'negation' },
    { textEn: 'I feel better now.', grammarTipAr: '📌 "now" ظرف زمان يدل على الحاضر. يأتي في نهاية الجملة أو بدايتها.', grammarCategory: 'tense' },
    { textEn: 'I am a university student.', grammarTipAr: '📌 "I am a/an + وظيفة أو صفة" — الصيغة الأساسية للتعريف بنفسك.', pronounTipAr: '👤 I am = أنا (المضارع مع فعل الكون)', grammarCategory: 'pronoun' },
    { textEn: 'What major are you studying?', grammarTipAr: '📌 "are you studying" — المضارع المستمر (present continuous). الصيغة: am/is/are + فعل + ing.', pronounTipAr: '👤 You = أنت. "are" مع you دائمًا.', grammarCategory: 'tense' },
    { textEn: 'I need help with this homework.', grammarTipAr: '📌 "help with" — تحتاج مساعدة في شيء. دائمًا "with" وليس "in" مع help.', grammarCategory: 'structure' },
    { textEn: 'I have an important meeting tomorrow.', grammarTipAr: '📌 "tomorrow" مع المضارع البسيط يعني المستقبل القريب. لا نحتاج "will" دائمًا.', grammarCategory: 'tense' },
    { textEn: 'I need to send an email.', grammarTipAr: '📌 "need to + فعل" = يجب أن. الفعل بعد "to" يبقى في صيغته الأصلية.', grammarCategory: 'verb' },
    { textEn: 'I am very busy right now.', grammarTipAr: '📌 "right now" = الآن تمامًا. أقوى من "now" وتؤكد اللحظة الحالية.', grammarCategory: 'tense' },
    { textEn: 'I agree with your opinion.', grammarTipAr: '📌 "agree with" — أوافق على. دائمًا "with" وليس "to" مع agree.', pronounTipAr: '👤 Your = ضمير ملكية للمخاطب (مثل: your name, your bag)', grammarCategory: 'pronoun' },
    { textEn: 'Hello, table for two, please.', grammarTipAr: '📌 جملة مختصرة بدون فعل — شائعة في المحادثة اليومية للطلب السريع.', grammarCategory: 'structure' },
    { textEn: 'May I see the menu, please?', grammarTipAr: '📌 "May I" = هل يمكنني. أكثر رسمية من "Can I" — تُستخدم في المطاعم الراقية.', grammarCategory: 'question' },
    { textEn: 'I will have the chicken with rice.', grammarTipAr: '📌 "I will have" في المطعم = سأطلب. "will" للمستقبل القريب والقرارات اللحظية.', grammarCategory: 'tense' },
    { textEn: 'I would like the salad without onions, please.', grammarTipAr: '📌 "I would like" = أود. أكثر أدبًا من "I want". استخدمها دائمًا في الطلب.', grammarCategory: 'verb' },
    { textEn: 'Could you make the food not spicy, please?', grammarTipAr: '📌 "Could you...?" أكثر أدبًا من "Can you". تستخدم للطلبات الخاصة.', grammarCategory: 'verb' },
    { textEn: 'Excuse me, this is not what I ordered.', grammarTipAr: '📌 "what I ordered" — جملة موصولة. "what" هنا تعني "الشيء الذي".', grammarCategory: 'structure' },
    { textEn: 'How much does this product cost, please?', grammarTipAr: '📌 "does this...cost?" — السؤال مع المضارع البسيط. "does" للمفرد (he/she/it).', grammarCategory: 'question' },
    { textEn: 'Do you have other sizes for this shirt?', grammarTipAr: '📌 "Do you have...?" السؤال عن الوجود/الامتلاك. "Do" للمضارع البسيط مع I/You/We/They.', pronounTipAr: '👤 You = أنت/أنتم. "Do you" للسؤال المباشر.', grammarCategory: 'question' },
    { textEn: 'I am looking for a black leather bag.', grammarTipAr: '📌 "looking for" = يبحث عن. المضارع المستمر يعبر عن فعل يحدث الآن.', grammarCategory: 'tense' },
    { textEn: 'This shirt is too small for me.', grammarTipAr: '📌 "too + صفة" = أكثر من اللازم بطريقة سلبية. "very small" ≠ "too small".', pronounTipAr: '👤 Me = إياي (ضمير المفعول به)', grammarCategory: 'pronoun' },
    { textEn: 'I want to return this product.', grammarTipAr: '📌 "want to + فعل" = أريد أن. الفعل بعد "to" دائمًا في صيغته الأصلية.', grammarCategory: 'verb' },
    { textEn: 'This is exactly what I am looking for.', grammarTipAr: '📌 "what I am looking for" جملة موصولة معقدة. "what" هنا = الشيء الذي.', grammarCategory: 'structure' },
    { textEn: 'Hello, how are you today?', grammarTipAr: '📌 "How are you?" السؤال عن الحال. الإجابة: "I am fine / good / great".', pronounTipAr: '👤 You = أنت. "are" دائمًا مع you.', grammarCategory: 'question' },
    { textEn: "It's a pleasure to meet you.", grammarTipAr: '📌 "It\'s" = It is. نستخدم "it" للتعبير عن مشاعر أو مواقف بشكل عام.', pronounTipAr: '👤 It = ضمير للأشياء والمواقف المجردة', grammarCategory: 'pronoun' },
    { textEn: 'Where are you from?', grammarTipAr: '📌 "Where are you from?" — "from" في نهاية الجملة طبيعي في الإنجليزية المحكية.', grammarCategory: 'question' },
    { textEn: 'I am from Saudi Arabia.', grammarTipAr: '📌 "I am from + بلد" — الصيغة الأساسية لذكر الجنسية أو المكان الأصلي.', grammarCategory: 'structure' },
    { textEn: 'Do you speak English?', grammarTipAr: '📌 "Do you speak...?" سؤال عن عادة أو قدرة. "Do" في المضارع البسيط مع you.', grammarCategory: 'question' },
    { textEn: "No, I don't speak English.", grammarTipAr: '📌 النفي في المضارع البسيط: don\'t = do + not. مع I/You/We/They.', grammarCategory: 'negation' },
    { textEn: 'How long have you been living here?', grammarTipAr: '📌 "How long have you been...?" — المضارع التام المستمر. للسؤال عن شيء بدأ في الماضي ومستمر.', grammarCategory: 'tense' },
  ]

  for (const update of grammarUpdates) {
    await prisma.sentence.updateMany({
      where: { textEn: update.textEn },
      data: {
        grammarTipAr: update.grammarTipAr ?? null,
        grammarTipEn: update.grammarTipEn ?? null,
        pronounTipAr: update.pronounTipAr ?? null,
        grammarCategory: update.grammarCategory ?? null,
        difficultyNote: update.difficultyNote ?? null,
      },
    })
  }

  const needHeuristic = await prisma.sentence.findMany({
    where: {
      isActive: true,
      OR: [{ grammarTipAr: null }, { grammarTipAr: '' }],
    },
    select: { id: true, textEn: true },
  })

  let heuristicCount = 0
  for (const row of needHeuristic) {
    const inferred = inferGrammarTipsForSentence(row.textEn)
    await prisma.sentence.update({
      where: { id: row.id },
      data: {
        grammarTipAr: inferred.grammarTipAr,
        grammarCategory: inferred.grammarCategory,
        pronounTipAr: inferred.pronounTipAr ?? null,
      },
    })
    heuristicCount++
  }

  console.log(
    `  ✓ ${grammarUpdates.length} curated (markdown) + ${heuristicCount} heuristic grammar tips on sentences`
  )
}

async function seedGrammarRules() {
  console.log('📐 Seeding grammar rules (levels 11–13)...')

  await prisma.grammarRule.deleteMany({})

  const L_PRONOUNS = 11
  const L_VERBS = 12
  const L_STRUCTURE = 13

  const rules: {
    levelId: number
    orderIndex: number
    titleAr: string
    titleEn: string
    explanation: string
    examples: { en: string; ar: string; note: string }[]
  }[] = [
    {
      levelId: L_PRONOUNS,
      orderIndex: 1,
      titleAr: 'ضمائر الفاعل',
      titleEn: 'Subject Pronouns',
      explanation: `ضمائر الفاعل تُستخدم عندما يكون الضمير هو فاعل الجملة (الشخص الذي يقوم بالفعل).

الضمائر السبعة:
• I = أنا
• You = أنت / أنتم
• He = هو (للمذكر)
• She = هي (للمؤنث)
• It = هو/هي (للأشياء والحيوانات)
• We = نحن
• They = هم / هن

قاعدة مهمة: الفعل يتغير مع He/She/It فقط في المضارع البسيط — يضاف "s" أو "es".`,
      examples: [
        { en: 'I work in a company.', ar: 'أنا أعمل في شركة.', note: 'I + فعل بدون تغيير' },
        { en: 'She works in a hospital.', ar: 'هي تعمل في مستشفى.', note: 'She + فعل + s' },
        { en: 'They study English.', ar: 'هم يدرسون الإنجليزية.', note: 'They + فعل بدون تغيير' },
        { en: 'He needs a doctor.', ar: 'هو يحتاج إلى طبيب.', note: 'He + فعل + s' },
        { en: 'We live in Saudi Arabia.', ar: 'نحن نعيش في السعودية.', note: 'We + فعل بدون تغيير' },
        { en: 'It is very cold today.', ar: 'الجو بارد جدًا اليوم.', note: 'It للطقس والأشياء' },
      ],
    },
    {
      levelId: L_PRONOUNS,
      orderIndex: 2,
      titleAr: 'ضمائر المفعول به',
      titleEn: 'Object Pronouns',
      explanation: `ضمائر المفعول به تُستخدم عندما يكون الضمير مفعولًا به في الجملة.

التحويل من الفاعل إلى المفعول:
• I → Me (أنا → إياي)
• You → You (أنت → إياك) — لا يتغير
• He → Him (هو → إياه)
• She → Her (هي → إياها)
• It → It (هو/هي → إياه) — لا يتغير
• We → Us (نحن → إيانا)
• They → Them (هم → إياهم)`,
      examples: [
        { en: 'Can you help me?', ar: 'هل يمكنك مساعدتي؟', note: 'me = مفعول به' },
        { en: 'I can see him.', ar: 'أنا أستطيع رؤيته.', note: 'him = مفعول به' },
        { en: 'She called us.', ar: 'هي اتصلت بنا.', note: 'us = مفعول به' },
        { en: 'I need to tell them.', ar: 'أحتاج أن أخبرهم.', note: 'them = مفعول به' },
        { en: 'Can I ask her?', ar: 'هل يمكنني أن أسألها؟', note: 'her = مفعول به' },
      ],
    },
    {
      levelId: L_PRONOUNS,
      orderIndex: 3,
      titleAr: 'ضمائر الملكية',
      titleEn: 'Possessive Pronouns',
      explanation: `ضمائر الملكية تُستخدم للتعبير عن الملكية — "ملكي، ملكك، ملكه..."

نوعان:
١. الملكية قبل الاسم (Possessive Adjectives):
My / Your / His / Her / Its / Our / Their

٢. الملكية المستقلة (Possessive Pronouns):
Mine / Yours / His / Hers / Its / Ours / Theirs`,
      examples: [
        { en: 'My name is Ahmed.', ar: 'اسمي أحمد.', note: 'my قبل الاسم' },
        { en: 'What is your job?', ar: 'ما هو عملك؟', note: 'your قبل الاسم' },
        { en: 'His bag is heavy.', ar: 'حقيبته ثقيلة.', note: 'his قبل الاسم' },
        { en: 'This bag is mine.', ar: 'هذه الحقيبة ملكي.', note: 'mine مستقل' },
        { en: 'Our team is great.', ar: 'فريقنا رائع.', note: 'our قبل الاسم' },
      ],
    },
    {
      levelId: L_PRONOUNS,
      orderIndex: 4,
      titleAr: 'ضمائر الإشارة',
      titleEn: 'Demonstrative Pronouns',
      explanation: `ضمائر الإشارة تُستخدم للإشارة إلى أشياء قريبة أو بعيدة.

• This = هذا/هذه (مفرد قريب)
• These = هؤلاء/هذه (جمع قريب)
• That = ذلك/تلك (مفرد بعيد)
• Those = أولئك/تلك (جمع بعيد)`,
      examples: [
        { en: 'This is not what I ordered.', ar: 'هذا ليس ما طلبته.', note: 'this للقريب المفرد' },
        { en: 'That hotel is expensive.', ar: 'ذلك الفندق غالٍ.', note: 'that للبعيد المفرد' },
        { en: 'These shoes are too big.', ar: 'هذه الأحذية كبيرة جدًا.', note: 'these للقريب الجمع' },
        { en: 'Those are my bags.', ar: 'تلك حقائبي.', note: 'those للبعيد الجمع' },
      ],
    },
    {
      levelId: L_VERBS,
      orderIndex: 1,
      titleAr: 'فعل الكون — To Be',
      titleEn: 'The Verb To Be',
      explanation: `"To Be" أهم فعل في الإنجليزية. له ثلاثة أشكال في المضارع:

• I → am
• You / We / They → are
• He / She / It → is

الاختصارات:
I am = I'm | You are = You're | He is = He's
She is = She's | We are = We're | They are = They're

النفي: am not / are not (aren't) / is not (isn't)`,
      examples: [
        { en: 'I am a university student.', ar: 'أنا طالب جامعي.', note: 'I + am' },
        { en: 'You are from Saudi Arabia.', ar: 'أنت من السعودية.', note: 'You + are' },
        { en: 'He is a doctor.', ar: 'هو طبيب.', note: 'He + is' },
        { en: 'We are not feeling well.', ar: 'نحن لا نشعر بتحسن.', note: 'We + are + not' },
        { en: "It isn't spicy.", ar: 'إنه غير حار.', note: 'It + is + not' },
      ],
    },
    {
      levelId: L_VERBS,
      orderIndex: 2,
      titleAr: 'فعل الامتلاك — To Have',
      titleEn: 'The Verb To Have',
      explanation: `"To Have" يُستخدم للتعبير عن الملكية أو الحالة.

المضارع البسيط:
• I / You / We / They → have
• He / She / It → has

استخدامات "have":
١. الملكية: I have a car.
٢. الحالة الجسدية: I have a headache.
٣. المضارع التام: I have been here.`,
      examples: [
        { en: 'I have severe pain.', ar: 'لدي ألم شديد.', note: 'have للحالة الجسدية' },
        { en: 'She has a meeting.', ar: 'لديها اجتماع.', note: 'has مع she' },
        { en: 'Do you have a receipt?', ar: 'هل لديك إيصال؟', note: 'have في السؤال' },
        { en: 'I have a high fever.', ar: 'لدي حرارة مرتفعة.', note: 'have للمرض' },
      ],
    },
    {
      levelId: L_VERBS,
      orderIndex: 3,
      titleAr: 'أفعال الحاجة والرغبة',
      titleEn: 'Need, Want, Would Like',
      explanation: `ثلاثة أفعال يومية مهمة جدًا:

• Need = يحتاج (ضرورة)
• Want = يريد (رغبة مباشرة)
• Would like = يودّ (رغبة مؤدبة)

الترتيب بعدها:
need/want/would like + to + فعل أصلي
أو: need/want/would like + اسم`,
      examples: [
        { en: 'I need a doctor.', ar: 'أحتاج طبيبًا.', note: 'need + اسم' },
        { en: 'I need to send an email.', ar: 'أحتاج أن أرسل بريدًا.', note: 'need + to + فعل' },
        { en: 'I want to return this.', ar: 'أريد إرجاع هذا.', note: 'want + to + فعل' },
        { en: 'I would like the chicken.', ar: 'أود طبق الدجاج.', note: 'would like + اسم' },
        { en: 'I would like to sit here.', ar: 'أود الجلوس هنا.', note: 'would like + to + فعل' },
      ],
    },
    {
      levelId: L_VERBS,
      orderIndex: 4,
      titleAr: 'أفعال الاستطاعة والإذن',
      titleEn: 'Can, Could, May',
      explanation: `ثلاثة أفعال ناقصة مهمة:

• Can = يستطيع / هل يمكن (عام)
• Could = هل يمكن (أكثر أدبًا من can)
• May = هل يمكنني (الأكثر رسمية)

ترتيبها من الأقل للأكثر رسمية:
Can < Could < May

بعدها مباشرة فعل أصلي بدون "to"`,
      examples: [
        { en: 'Can you help me?', ar: 'هل يمكنك مساعدتي؟', note: 'can للطلب اليومي' },
        { en: 'Can I try this on?', ar: 'هل يمكنني تجربة هذا؟', note: 'can للإذن' },
        { en: 'Could you repeat that?', ar: 'هل يمكنك التكرار؟', note: 'could أكثر أدبًا' },
        { en: 'May I see the menu?', ar: 'هل يمكنني رؤية القائمة؟', note: 'may للرسمي' },
      ],
    },
    {
      levelId: L_STRUCTURE,
      orderIndex: 1,
      titleAr: 'الجملة الإخبارية',
      titleEn: 'Affirmative Sentences',
      explanation: `الجملة الإخبارية الأساسية تتكون من:
فاعل + فعل + مفعول به (اختياري)

ترتيب الجملة الإنجليزية ثابت ومختلف عن العربية:
• الفاعل دائمًا قبل الفعل
• لا يمكن حذف الفاعل (إلا في الأمر)

المضارع البسيط:
S + V (+ s/es with he/she/it) + Object`,
      examples: [
        { en: 'I work in a company.', ar: 'أعمل في شركة.', note: 'فاعل + فعل + مكان' },
        { en: 'She studies English.', ar: 'هي تدرس الإنجليزية.', note: 'فاعل + فعل+s + مفعول' },
        { en: 'We need a taxi.', ar: 'نحن نحتاج تاكسي.', note: 'فاعل + فعل + مفعول' },
      ],
    },
    {
      levelId: L_STRUCTURE,
      orderIndex: 2,
      titleAr: 'الجملة النافية',
      titleEn: 'Negative Sentences',
      explanation: `لبناء جملة نافية في المضارع البسيط:

مع I/You/We/They:
فاعل + do not (don't) + فعل أصلي

مع He/She/It:
فاعل + does not (doesn't) + فعل أصلي

مع فعل الكون (am/is/are):
فاعل + am/is/are + not`,
      examples: [
        { en: "I don't speak English.", ar: 'لا أتكلم الإنجليزية.', note: "don't مع I" },
        { en: "She doesn't work here.", ar: 'هي لا تعمل هنا.', note: "doesn't مع she" },
        { en: 'I am not feeling better.', ar: 'لا أشعر بتحسن.', note: 'am not مع I' },
        { en: 'This is not what I ordered.', ar: 'هذا ليس ما طلبته.', note: 'is not مع this' },
      ],
    },
    {
      levelId: L_STRUCTURE,
      orderIndex: 3,
      titleAr: 'الجملة الاستفهامية',
      titleEn: 'Question Sentences',
      explanation: `أنواع الأسئلة في الإنجليزية:

١. Yes/No Questions (نعم/لا):
Do/Does/Is/Are/Can + فاعل + فعل?

٢. Wh- Questions (أسئلة التفاصيل):
What / Where / When / Who / How / Why + do/does/is + فاعل + فعل?

الفرق المهم:
• Do = مع I/You/We/They
• Does = مع He/She/It`,
      examples: [
        { en: 'Do you have a receipt?', ar: 'هل لديك إيصال؟', note: 'yes/no مع you' },
        { en: 'Does she work here?', ar: 'هل هي تعمل هنا؟', note: 'yes/no مع she' },
        { en: 'Where is the nearest ATM?', ar: 'أين أقرب صراف آلي؟', note: 'wh- question' },
        { en: 'How much does it cost?', ar: 'كم يكلف؟', note: 'how much + does' },
        { en: 'When does the train leave?', ar: 'متى يغادر القطار؟', note: 'when + does' },
      ],
    },
    {
      levelId: L_STRUCTURE,
      orderIndex: 4,
      titleAr: 'الأزمنة الأساسية',
      titleEn: 'Basic Tenses',
      explanation: `الأزمنة الثلاثة الأساسية التي تحتاجها يوميًا:

١. المضارع البسيط (Simple Present):
للعادات والحقائق — I work / She works

٢. المضارع المستمر (Present Continuous):
لما يحدث الآن — I am working / She is working

٣. الماضي البسيط (Simple Past):
لما حدث وانتهى — I worked / She worked

علامات كل زمن:
• كل يوم / دائمًا = مضارع بسيط
• الآن / في هذه اللحظة = مضارع مستمر
• أمس / الأسبوع الماضي = ماضي بسيط`,
      examples: [
        { en: 'I work every day.', ar: 'أعمل كل يوم.', note: 'مضارع بسيط — عادة' },
        { en: 'I am working right now.', ar: 'أعمل الآن.', note: 'مضارع مستمر — الآن' },
        { en: 'I worked yesterday.', ar: 'عملت أمس.', note: 'ماضي بسيط — انتهى' },
        { en: 'She is studying English.', ar: 'هي تدرس الإنجليزية الآن.', note: 'مستمر مع she' },
      ],
    },
  ]

  for (const rule of rules) {
    await prisma.grammarRule.create({
      data: {
        levelId: rule.levelId,
        orderIndex: rule.orderIndex,
        titleAr: rule.titleAr,
        titleEn: rule.titleEn,
        explanation: rule.explanation,
        examples: rule.examples,
      },
    })
  }

  console.log(`  ✓ ${rules.length} grammar rules seeded`)
}

// ─────────────────────────────────────────
// RUN
// ─────────────────────────────────────────

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
