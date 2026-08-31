/**
 * Moajam Kids course catalog + lesson screens.
 * Mirrors former frontend static content in mujam/src/kids/data/modules.ts
 */
import { Prisma, PrismaClient } from '@prisma/client'

export type FlashcardItem = { en: string; ar: string; icon: string }

export type LessonScreen =
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

export type ModuleSeed = {
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
  school: [
    { en: 'Book', ar: 'كتاب', icon: '📚' },
    { en: 'Pen', ar: 'قلم', icon: '✏️' },
    { en: 'Desk', ar: 'مكتب', icon: '🪑' },
    { en: 'Teacher', ar: 'معلّم', icon: '👩‍🏫' },
    { en: 'School', ar: 'مدرسة', icon: '🏫' },
    { en: 'Backpack', ar: 'حقيبة', icon: '🎒' },
  ],
  body: [
    { en: 'Head', ar: 'رأس', icon: '🙂' },
    { en: 'Hand', ar: 'يد', icon: '✋' },
    { en: 'Foot', ar: 'قدم', icon: '🦶' },
    { en: 'Eye', ar: 'عين', icon: '👁️' },
    { en: 'Ear', ar: 'أذن', icon: '👂' },
    { en: 'Nose', ar: 'أنف', icon: '👃' },
  ],
  transport: [
    { en: 'Car', ar: 'سيارة', icon: '🚗' },
    { en: 'Bus', ar: 'حافلة', icon: '🚌' },
    { en: 'Train', ar: 'قطار', icon: '🚆' },
    { en: 'Plane', ar: 'طائرة', icon: '✈️' },
    { en: 'Boat', ar: 'قارب', icon: '⛵' },
    { en: 'Bike', ar: 'دراجة', icon: '🚲' },
  ],
  clothes: [
    { en: 'Shirt', ar: 'قميص', icon: '👕' },
    { en: 'Pants', ar: 'بنطال', icon: '👖' },
    { en: 'Shoes', ar: 'حذاء', icon: '👟' },
    { en: 'Hat', ar: 'قبعة', icon: '🧢' },
    { en: 'Dress', ar: 'فستان', icon: '👗' },
    { en: 'Coat', ar: 'معطف', icon: '🧥' },
  ],
  nature: [
    { en: 'Tree', ar: 'شجرة', icon: '🌳' },
    { en: 'Flower', ar: 'زهرة', icon: '🌸' },
    { en: 'Sun', ar: 'شمس', icon: '☀️' },
    { en: 'Moon', ar: 'قمر', icon: '🌙' },
    { en: 'Star', ar: 'نجمة', icon: '⭐' },
    { en: 'River', ar: 'نهر', icon: '🏞️' },
  ],
  toys: [
    { en: 'Ball', ar: 'كرة', icon: '⚽' },
    { en: 'Doll', ar: 'دمية', icon: '🪆' },
    { en: 'Blocks', ar: 'مكعبات', icon: '🧱' },
    { en: 'Kite', ar: 'طائرة ورقية', icon: '🪁' },
    { en: 'Puzzle', ar: 'أحجية', icon: '🧩' },
    { en: 'Teddy', ar: 'دبدوب', icon: '🧸' },
  ],
  shapes: [
    { en: 'Circle', ar: 'دائرة', icon: '⭕' },
    { en: 'Square', ar: 'مربع', icon: '⬜' },
    { en: 'Triangle', ar: 'مثلث', icon: '🔺' },
    { en: 'Star', ar: 'نجمة', icon: '⭐' },
    { en: 'Heart', ar: 'قلب', icon: '❤️' },
    { en: 'Diamond', ar: 'معيّن', icon: '💎' },
  ],
  actions: [
    { en: 'Run', ar: 'أجري', icon: '🏃' },
    { en: 'Jump', ar: 'أقفز', icon: '🤸' },
    { en: 'Read', ar: 'أقرأ', icon: '📖' },
    { en: 'Write', ar: 'أكتب', icon: '✍️' },
    { en: 'Sing', ar: 'أغنّي', icon: '🎤' },
    { en: 'Dance', ar: 'أرقص', icon: '💃' },
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

/** Source of truth for kids lesson vocabulary (used by audio generation script). */
export const KIDS_MODULE_SEEDS: ModuleSeed[] = [
  {
    id: 'alphabet',
    titleEn: 'Alphabet',
    titleAr: 'الحروف الأبجدية',
    icon: '🔤',
    color: 'blue',
    orderIndex: 0,
    progress: 0,
    stars: 0,
    screens: alphabetScreens(),
  },
  {
    id: 'numbers',
    titleEn: 'Numbers',
    titleAr: 'الأرقام',
    icon: '🔢',
    color: 'yellow',
    orderIndex: 1,
    progress: 0,
    stars: 0,
    screens: numbersScreens(),
  },
  {
    id: 'colors',
    titleEn: 'Colors',
    titleAr: 'الألوان',
    icon: '🎨',
    color: 'pink',
    orderIndex: 2,
    progress: 0,
    stars: 0,
    screens: themeScreens('Colors', 'الألوان', packs.colors),
  },
  {
    id: 'feelings',
    titleEn: 'Feelings',
    titleAr: 'المشاعر',
    icon: '😊',
    color: 'purple',
    orderIndex: 3,
    progress: 0,
    stars: 0,
    screens: themeScreens('Feelings', 'المشاعر', packs.feelings),
  },
  {
    id: 'animals',
    titleEn: 'Animals',
    titleAr: 'الحيوانات',
    icon: '🦁',
    color: 'green',
    orderIndex: 4,
    progress: 0,
    stars: 0,
    screens: themeScreens('Animals', 'الحيوانات', packs.animals),
  },
  {
    id: 'food',
    titleEn: 'Food',
    titleAr: 'الطعام',
    icon: '🍎',
    color: 'orange',
    orderIndex: 5,
    progress: 0,
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
  {
    id: 'school',
    titleEn: 'School',
    titleAr: 'المدرسة',
    icon: '🏫',
    color: 'purple',
    orderIndex: 10,
    progress: 0,
    stars: 0,
    screens: themeScreens('School', 'المدرسة', packs.school),
  },
  {
    id: 'body',
    titleEn: 'Body Parts',
    titleAr: 'أجزاء الجسم',
    icon: '🫀',
    color: 'pink',
    orderIndex: 11,
    progress: 0,
    stars: 0,
    screens: themeScreens('Body Parts', 'أجزاء الجسم', packs.body),
  },
  {
    id: 'transport',
    titleEn: 'Transport',
    titleAr: 'المواصلات',
    icon: '🚌',
    color: 'yellow',
    orderIndex: 12,
    progress: 0,
    stars: 0,
    screens: themeScreens('Transport', 'المواصلات', packs.transport),
  },
  {
    id: 'clothes',
    titleEn: 'Clothes',
    titleAr: 'الملابس',
    icon: '👕',
    color: 'orange',
    orderIndex: 13,
    progress: 0,
    stars: 0,
    screens: themeScreens('Clothes', 'الملابس', packs.clothes),
  },
  {
    id: 'nature',
    titleEn: 'Nature',
    titleAr: 'الطبيعة',
    icon: '🌳',
    color: 'green',
    orderIndex: 14,
    progress: 0,
    stars: 0,
    screens: themeScreens('Nature', 'الطبيعة', packs.nature),
  },
  {
    id: 'toys',
    titleEn: 'Toys',
    titleAr: 'الألعاب',
    icon: '🧸',
    color: 'pink',
    orderIndex: 15,
    progress: 0,
    stars: 0,
    screens: themeScreens('Toys', 'الألعاب', packs.toys),
  },
  {
    id: 'shapes',
    titleEn: 'Shapes',
    titleAr: 'الأشكال',
    icon: '⬜',
    color: 'blue',
    orderIndex: 16,
    progress: 0,
    stars: 0,
    screens: themeScreens('Shapes', 'الأشكال', packs.shapes),
  },
  {
    id: 'actions',
    titleEn: 'Actions',
    titleAr: 'الأفعال',
    icon: '🏃',
    color: 'purple',
    orderIndex: 17,
    progress: 0,
    stars: 0,
    screens: themeScreens('Actions', 'الأفعال', packs.actions),
  },
]

function screenToPayload(screen: LessonScreen): Prisma.InputJsonValue {
  const { type: _type, ...rest } = screen
  return rest as Prisma.InputJsonValue
}

export async function seedKidsCourses(prisma: PrismaClient) {
  console.log('🧒 Seeding kids courses...')

  for (const mod of KIDS_MODULE_SEEDS) {
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

  console.log(`  ✓ ${KIDS_MODULE_SEEDS.length} kids modules + ${KIDS_MODULE_SEEDS.reduce((n, m) => n + m.screens.length, 0)} lesson screens seeded`)
}
