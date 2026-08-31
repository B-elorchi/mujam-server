/**
 * Moajam Kids course catalog + lesson screens.
 * Mirrors former frontend static content in mujam/src/kids/data/modules.ts
 */
import { Prisma, PrismaClient } from '@prisma/client'

type FlashcardItem = { en: string; ar: string; icon: string }

type LessonScreen =
  | { type: 'flashcard'; items: FlashcardItem[] }
  | { type: 'listen'; titleEn: string; titleAr: string; items: FlashcardItem[] }
  | { type: 'grid'; titleEn: string; titleAr: string; items: FlashcardItem[] }
  | { type: 'matching'; items: FlashcardItem[] }
  | {
      type: 'choice'
      questions: {
        promptEn: string
        promptAr: string
        icon?: string
        options: { label: string; icon?: string; correct?: boolean }[]
      }[]
    }
  | { type: 'sort'; titleEn: string; titleAr: string; items: FlashcardItem[] }
  | { type: 'speak'; titleEn: string; titleAr: string; items: FlashcardItem[] }
  | { type: 'complete' }

type ModuleSeed = {
  id: string
  titleEn: string
  titleAr: string
  icon: string
  color: string
  orderIndex: number
  progress: number
  stars: number
  screens: LessonScreen[]
}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const letterWords: Record<string, FlashcardItem> = {
  A: { en: 'Apple', ar: 'تفاحة', icon: '🍎' },
  B: { en: 'Ball', ar: 'كرة', icon: '⚽' },
  C: { en: 'Cat', ar: 'قطة', icon: '🐱' },
  D: { en: 'Dog', ar: 'كلب', icon: '🐶' },
}

const packs: Record<string, FlashcardItem[]> = {
  colors: [
    { en: 'Red', ar: 'أحمر', icon: '🔴' },
    { en: 'Blue', ar: 'أزرق', icon: '🔵' },
    { en: 'Yellow', ar: 'أصفر', icon: '🟡' },
    { en: 'Green', ar: 'أخضر', icon: '🟢' },
    { en: 'Purple', ar: 'بنفسجي', icon: '🟣' },
    { en: 'Orange', ar: 'برتقالي', icon: '🟠' },
  ],
  feelings: [
    { en: 'Happy', ar: 'سعيد', icon: '😀' },
    { en: 'Sad', ar: 'حزين', icon: '😢' },
    { en: 'Angry', ar: 'غاضب', icon: '😠' },
    { en: 'Sleepy', ar: 'نعسان', icon: '😴' },
    { en: 'Scared', ar: 'خائف', icon: '😨' },
  ],
  animals: [
    { en: 'Lion', ar: 'أسد', icon: '🦁' },
    { en: 'Elephant', ar: 'فيل', icon: '🐘' },
    { en: 'Bird', ar: 'طائر', icon: '🐦' },
    { en: 'Fish', ar: 'سمكة', icon: '🐟' },
    { en: 'Rabbit', ar: 'أرنب', icon: '🐰' },
    { en: 'Horse', ar: 'حصان', icon: '🐴' },
  ],
  food: [
    { en: 'Bread', ar: 'خبز', icon: '🍞' },
    { en: 'Milk', ar: 'حليب', icon: '🥛' },
    { en: 'Egg', ar: 'بيضة', icon: '🥚' },
    { en: 'Banana', ar: 'موز', icon: '🍌' },
    { en: 'Rice', ar: 'أرز', icon: '🍚' },
  ],
  family: [
    { en: 'Mother', ar: 'أم', icon: '👩' },
    { en: 'Father', ar: 'أب', icon: '👨' },
    { en: 'Sister', ar: 'أخت', icon: '👧' },
    { en: 'Brother', ar: 'أخ', icon: '👦' },
    { en: 'Baby', ar: 'طفل', icon: '👶' },
  ],
  routines: [
    { en: 'Wake up', ar: 'أستيقظ', icon: '⏰' },
    { en: 'Brush teeth', ar: 'أنظف أسناني', icon: '🪥' },
    { en: 'Eat', ar: 'آكل', icon: '🍽️' },
    { en: 'Play', ar: 'ألعب', icon: '🧸' },
    { en: 'Sleep', ar: 'أنام', icon: '🛏️' },
  ],
  weather: [
    { en: 'Sunny', ar: 'مشمس', icon: '☀️' },
    { en: 'Rainy', ar: 'ممطر', icon: '🌧️' },
    { en: 'Cloudy', ar: 'غائم', icon: '☁️' },
    { en: 'Snowy', ar: 'مثلج', icon: '❄️' },
    { en: 'Windy', ar: 'عاصف', icon: '🌬️' },
  ],
  home: [
    { en: 'Door', ar: 'باب', icon: '🚪' },
    { en: 'Chair', ar: 'كرسي', icon: '🪑' },
    { en: 'Bed', ar: 'سرير', icon: '🛏️' },
    { en: 'Lamp', ar: 'مصباح', icon: '💡' },
    { en: 'Window', ar: 'نافذة', icon: '🪟' },
  ],
}

function themeScreens(
  titleEn: string,
  titleAr: string,
  items: FlashcardItem[]
): LessonScreen[] {
  return [
    { type: 'flashcard', items },
    {
      type: 'listen',
      titleEn: `Listen: ${titleEn}`,
      titleAr: `استمع: ${titleAr}`,
      items: items.slice(0, 4),
    },
    { type: 'grid', titleEn, titleAr, items },
    { type: 'matching', items: items.slice(0, 4) },
    {
      type: 'sort',
      titleEn: `Order: ${titleEn}`,
      titleAr: `رتّب: ${titleAr}`,
      items: items.slice(0, 4),
    },
    {
      type: 'speak',
      titleEn: `Say it: ${titleEn}`,
      titleAr: `انطق: ${titleAr}`,
      items: items.slice(0, 3),
    },
    {
      type: 'choice',
      questions: [
        {
          promptEn: `Where is ${items[0].en.toLowerCase()}?`,
          promptAr: `أين ${items[0].ar}؟`,
          options: [
            { label: items[1].icon },
            { label: items[0].icon, correct: true },
            { label: items[2]?.icon ?? items[1].icon },
          ],
        },
        {
          promptEn: 'What is this?',
          promptAr: 'ما هذا؟',
          icon: items[1].icon,
          options: [
            { label: items[0].en },
            { label: items[1].en, correct: true },
            { label: items[2]?.en ?? 'None' },
          ],
        },
      ],
    },
    { type: 'complete' },
  ]
}

function alphabetScreens(): LessonScreen[] {
  return [
    { type: 'flashcard', items: [letterWords.A, letterWords.B, letterWords.C, letterWords.D] },
    {
      type: 'listen',
      titleEn: 'Listen to the letters',
      titleAr: 'استمع إلى الحروف',
      items: [letterWords.A, letterWords.B, letterWords.C, letterWords.D],
    },
    {
      type: 'grid',
      titleEn: 'The Alphabet',
      titleAr: 'الحروف الأبجدية',
      items: letters.map((l) => ({ en: l, ar: l.toLowerCase(), icon: l })),
    },
    { type: 'matching', items: [letterWords.A, letterWords.B, letterWords.C, letterWords.D] },
    {
      type: 'choice',
      questions: [
        {
          promptEn: 'What starts with A?',
          promptAr: 'ما الذي يبدأ بحرف A؟',
          options: [{ label: '🍎', correct: true }, { label: '🐶' }, { label: '⚽' }],
        },
        {
          promptEn: 'Which letter is this?',
          promptAr: 'ما هذا الحرف؟',
          icon: 'C',
          options: [{ label: 'B' }, { label: 'C', correct: true }, { label: 'D' }, { label: 'A' }],
        },
      ],
    },
    { type: 'complete' },
  ]
}

function numbersScreens(): LessonScreen[] {
  const nums: FlashcardItem[] = [
    { en: 'One', ar: 'واحد', icon: '1️⃣' },
    { en: 'Two', ar: 'اثنان', icon: '2️⃣' },
    { en: 'Three', ar: 'ثلاثة', icon: '3️⃣' },
    { en: 'Four', ar: 'أربعة', icon: '4️⃣' },
    { en: 'Five', ar: 'خمسة', icon: '5️⃣' },
    { en: 'Six', ar: 'ستة', icon: '6️⃣' },
    { en: 'Seven', ar: 'سبعة', icon: '7️⃣' },
    { en: 'Eight', ar: 'ثمانية', icon: '8️⃣' },
    { en: 'Nine', ar: 'تسعة', icon: '9️⃣' },
    { en: 'Ten', ar: 'عشرة', icon: '🔟' },
  ]
  return [
    { type: 'flashcard', items: nums.slice(0, 5) },
    {
      type: 'listen',
      titleEn: 'Listen to numbers',
      titleAr: 'استمع إلى الأرقام',
      items: nums.slice(0, 4),
    },
    { type: 'grid', titleEn: 'Numbers 1–10', titleAr: 'الأرقام من ١ إلى ١٠', items: nums },
    { type: 'matching', items: nums.slice(0, 4) },
    {
      type: 'choice',
      questions: [
        {
          promptEn: 'How many is three?',
          promptAr: 'أين الرقم ثلاثة؟',
          options: [{ label: '2️⃣' }, { label: '3️⃣', correct: true }, { label: '5️⃣' }],
        },
      ],
    },
    { type: 'complete' },
  ]
}

const MODULES: ModuleSeed[] = [
  {
    id: 'alphabet',
    titleEn: 'Alphabet',
    titleAr: 'الحروف الأبجدية',
    icon: '🔤',
    color: 'blue',
    orderIndex: 0,
    progress: 80,
    stars: 3,
    screens: alphabetScreens(),
  },
  {
    id: 'numbers',
    titleEn: 'Numbers',
    titleAr: 'الأرقام',
    icon: '🔢',
    color: 'yellow',
    orderIndex: 1,
    progress: 60,
    stars: 2,
    screens: numbersScreens(),
  },
  {
    id: 'colors',
    titleEn: 'Colors',
    titleAr: 'الألوان',
    icon: '🎨',
    color: 'pink',
    orderIndex: 2,
    progress: 45,
    stars: 2,
    screens: themeScreens('Colors', 'الألوان', packs.colors),
  },
  {
    id: 'feelings',
    titleEn: 'Feelings',
    titleAr: 'المشاعر',
    icon: '😊',
    color: 'purple',
    orderIndex: 3,
    progress: 30,
    stars: 1,
    screens: themeScreens('Feelings', 'المشاعر', packs.feelings),
  },
  {
    id: 'animals',
    titleEn: 'Animals',
    titleAr: 'الحيوانات',
    icon: '🦁',
    color: 'green',
    orderIndex: 4,
    progress: 20,
    stars: 1,
    screens: themeScreens('Animals', 'الحيوانات', packs.animals),
  },
  {
    id: 'food',
    titleEn: 'Food',
    titleAr: 'الطعام',
    icon: '🍎',
    color: 'orange',
    orderIndex: 5,
    progress: 10,
    stars: 0,
    screens: themeScreens('Food', 'الطعام', packs.food),
  },
  {
    id: 'family',
    titleEn: 'Family',
    titleAr: 'العائلة',
    icon: '👨‍👩‍👧',
    color: 'sky',
    orderIndex: 6,
    progress: 0,
    stars: 0,
    screens: themeScreens('Family', 'العائلة', packs.family),
  },
  {
    id: 'routines',
    titleEn: 'Daily Routines',
    titleAr: 'الأفعال اليومية',
    icon: '🪥',
    color: 'blue',
    orderIndex: 7,
    progress: 0,
    stars: 0,
    screens: themeScreens('Daily Routines', 'الأفعال اليومية', packs.routines),
  },
  {
    id: 'weather',
    titleEn: 'Weather',
    titleAr: 'الطقس والفصول',
    icon: '🌤️',
    color: 'sky',
    orderIndex: 8,
    progress: 0,
    stars: 0,
    screens: themeScreens('Weather', 'الطقس والفصول', packs.weather),
  },
  {
    id: 'home',
    titleEn: 'Home',
    titleAr: 'المنزل والأشياء',
    icon: '🏠',
    color: 'green',
    orderIndex: 9,
    progress: 0,
    stars: 0,
    screens: themeScreens('Home', 'المنزل والأشياء', packs.home),
  },
]

function screenToPayload(screen: LessonScreen): Prisma.InputJsonValue {
  const { type: _type, ...rest } = screen
  return rest as Prisma.InputJsonValue
}

export async function seedKidsCourses(prisma: PrismaClient) {
  console.log('🧒 Seeding kids courses...')

  for (const mod of MODULES) {
    await prisma.kidsModule.upsert({
      where: { id: mod.id },
      create: {
        id: mod.id,
        titleEn: mod.titleEn,
        titleAr: mod.titleAr,
        icon: mod.icon,
        color: mod.color,
        orderIndex: mod.orderIndex,
        isActive: true,
        progress: mod.progress,
        stars: mod.stars,
      },
      update: {
        titleEn: mod.titleEn,
        titleAr: mod.titleAr,
        icon: mod.icon,
        color: mod.color,
        orderIndex: mod.orderIndex,
        isActive: true,
        progress: mod.progress,
        stars: mod.stars,
      },
    })

    // Replace screens so seed stays source of truth for lesson content
    await prisma.kidsLessonScreen.deleteMany({ where: { moduleId: mod.id } })
    await prisma.kidsLessonScreen.createMany({
      data: mod.screens.map((screen, i) => ({
        moduleId: mod.id,
        type: screen.type,
        orderIndex: i,
        payload: screenToPayload(screen),
      })),
    })
  }

  console.log(`  ✓ ${MODULES.length} kids modules + lessons seeded`)
}
