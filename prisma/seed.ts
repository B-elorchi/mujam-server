// prisma/seed.ts
// Complete seed file for معجم platform
// Contains all sentences extracted from the 6 official PDF booklets

import { PrismaClient, GameType, UserRole, SubscriptionPlan } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  await seedLevels()
  await seedSentences()
  await seedPlacementQuestions()
  await seedAISettings()
  await seedAIScenarios()
  await seedAchievements()
  await seedPlatformSettings()
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
    { id: 1, titleAr: 'السفر والمواصلات', titleEn: 'Travel & Transportation', icon: '✈️', orderIndex: 1, isFree: true },
    { id: 2, titleAr: 'المستشفى', titleEn: 'Hospital', icon: '🏥', orderIndex: 2, isFree: true },
    { id: 3, titleAr: 'العمل والمدرسة', titleEn: 'Work & School', icon: '💼', orderIndex: 3, isFree: false },
    { id: 4, titleAr: 'المطعم', titleEn: 'Restaurant', icon: '🍽️', orderIndex: 4, isFree: false },
    { id: 5, titleAr: 'التسوق', titleEn: 'Shopping', icon: '🛒', orderIndex: 5, isFree: false },
    { id: 6, titleAr: 'التعارف والعلاقات', titleEn: 'Introductions & Relations', icon: '🤝', orderIndex: 6, isFree: false },
    { id: 7, titleAr: 'التعارف والتحية', titleEn: 'Greetings & Meetings', icon: '👋', orderIndex: 7, isFree: false },
  ]

  for (const level of levels) {
    await prisma.level.upsert({
      where: { id: level.id },
      create: level,
      update: level,
    })
  }

  console.log(`  ✓ ${levels.length} levels seeded`)
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

// ─────────────────────────────────────────
// PLACEMENT TEST QUESTIONS
// 2 per level = 14 total, covers all 7 levels
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
    await prisma.story.create({ data: story })
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
  for (let levelId = 1; levelId <= 6; levelId++) {
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
      take: 5
    });

    // Add mixed questions for each quiz
    const questions = [];

    for (let i = 0; i < 5; i++) {
      const sentence = levelSentences[i % levelSentences.length];

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
          points: 20,
          orderIndex: i + 1,
        });
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
          points: 20,
          orderIndex: i + 1,
        });
      }
    }

    await prisma.quizQuestion.createMany({ data: questions })
  }

  console.log(`  ✓ Quizzes seeded for 6 levels`)
}

// ─────────────────────────────────────────
// GAMES
// ─────────────────────────────────────────

async function seedGames() {
  console.log('🎮 Seeding games...')

  await prisma.game.deleteMany({})

  for (let levelId = 1; levelId <= 6; levelId++) {
    // 1. Arrange sentences game
    const game1 = await prisma.game.create({
      data: {
        levelId,
        type: 'DRAG_DROP',
        titleAr: 'رتّب الجملة',
        orderIndex: 1,
      }
    })

    await prisma.gameQuestion.create({
      data: {
        gameId: game1.id,
        questionData: {
          sentenceEn: 'How are you today?',
          words: ['How', 'are', 'you', 'today', '?'],
          correctOrder: ['How', 'are', 'you', 'today', '?'],
        },
        correctAnswer: JSON.stringify(['How', 'are', 'you', 'today', '?']),
        orderIndex: 1,
      }
    })

    // 2. Choice game
    const game2 = await prisma.game.create({
      data: {
        levelId,
        type: 'MULTIPLE_CHOICE',
        titleAr: 'اختر الصحيح',
        orderIndex: 2,
      }
    })

    await prisma.gameQuestion.create({
      data: {
        gameId: game2.id,
        questionData: {
          question: 'How do you say "Good morning" in Arabic?',
          options: ['صباح الخير', 'مساء الخير', 'شكراً'],
        },
        correctAnswer: 'صباح الخير',
        orderIndex: 1,
      }
    })

    // 3. Fill in the blank
    const game3 = await prisma.game.create({
      data: {
        levelId,
        type: 'FILL_BLANK',
        titleAr: 'املأ الفراغ',
        orderIndex: 3,
      }
    })

    await prisma.gameQuestion.create({
      data: {
        gameId: game3.id,
        questionData: {
          question: 'Good ___ !',
          hint: 'morning',
        },
        correctAnswer: 'morning',
        orderIndex: 1,
      }
    })
  }

  console.log('  ✓ Games seeded for 6 levels')
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