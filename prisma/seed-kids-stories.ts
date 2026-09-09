/**
 * Moajam Kids listen-along stories.
 * Cues are timed for a gentle kids narration pace (~2.2 words/sec).
 * audioUrl is left null until real narration assets are uploaded via admin.
 */
import { Prisma, PrismaClient } from '@prisma/client'

export type KidsStoryCue = { start: number; end: number; text: string }

export type KidsStorySeed = {
  id: string
  titleEn: string
  titleAr: string
  summaryEn: string
  summaryAr: string
  coverEmoji: string
  coverUrl?: string | null
  audioUrl?: string | null
  textEn: string
  textAr: string
  cuesEn: KidsStoryCue[]
  cuesAr: KidsStoryCue[]
  accentColor: string
  orderIndex: number
  durationSec: number
}

/** Build approximate cue timings from sentence-ish chunks. */
function cuesFromChunks(chunks: string[], wordsPerSec = 2.2, gap = 0.25): KidsStoryCue[] {
  let t = 0.4
  return chunks.map((text) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length
    const dur = Math.max(1.2, words / wordsPerSec)
    const cue = { start: Number(t.toFixed(2)), end: Number((t + dur).toFixed(2)), text: text.trim() }
    t += dur + gap
    return cue
  })
}

const stories: KidsStorySeed[] = [
  {
    id: 'sara-and-the-sun',
    titleEn: 'Sara and the Sun',
    titleAr: 'سارة والشمس',
    summaryEn: 'Sara greets the morning sun and learns a sunny hello.',
    summaryAr: 'سارة ترحّب بشمس الصباح وتتعلم تحية مشرقة.',
    coverEmoji: '☀️',
    accentColor: 'yellow',
    orderIndex: 0,
    textEn:
      'Good morning, Sun! Sara opens the window. The sun is warm and bright. Sara says hello. Hello, Sun! Today is a happy day.',
    textAr:
      'صباح الخير يا شمس! سارة تفتح النافذة. الشمس دافئة ومشرقة. سارة تقول مرحباً. مرحباً يا شمس! اليوم يوم سعيد.',
    cuesEn: cuesFromChunks([
      'Good morning, Sun!',
      'Sara opens the window.',
      'The sun is warm and bright.',
      'Sara says hello.',
      'Hello, Sun!',
      'Today is a happy day.',
    ]),
    cuesAr: cuesFromChunks([
      'صباح الخير يا شمس!',
      'سارة تفتح النافذة.',
      'الشمس دافئة ومشرقة.',
      'سارة تقول مرحباً.',
      'مرحباً يا شمس!',
      'اليوم يوم سعيد.',
    ]),
    durationSec: 18,
  },
  {
    id: 'omar-and-the-cat',
    titleEn: 'Omar and the Cat',
    titleAr: 'عمر والقطة',
    summaryEn: 'Omar meets a soft cat and practices kind words.',
    summaryAr: 'عمر يلتقي قطة ناعمة ويتدرّب على كلمات لطيفة.',
    coverEmoji: '🐱',
    accentColor: 'pink',
    orderIndex: 1,
    textEn:
      'Omar sees a little cat. The cat is soft. Omar says, Nice cat! The cat says meow. Omar smiles. Come here, little friend.',
    textAr:
      'عمر يرى قطة صغيرة. القطة ناعمة. عمر يقول: قطة جميلة! القطة تقول مياو. عمر يبتسم. تعال يا صديقي الصغير.',
    cuesEn: cuesFromChunks([
      'Omar sees a little cat.',
      'The cat is soft.',
      'Omar says, Nice cat!',
      'The cat says meow.',
      'Omar smiles.',
      'Come here, little friend.',
    ]),
    cuesAr: cuesFromChunks([
      'عمر يرى قطة صغيرة.',
      'القطة ناعمة.',
      'عمر يقول: قطة جميلة!',
      'القطة تقول مياو.',
      'عمر يبتسم.',
      'تعال يا صديقي الصغير.',
    ]),
    durationSec: 16,
  },
  {
    id: 'luna-and-the-moon',
    titleEn: 'Luna and the Moon',
    titleAr: 'لونا والقمر',
    summaryEn: 'Luna looks at the moon and whispers a bedtime wish.',
    summaryAr: 'لونا تنظر إلى القمر وتهمس بأمنية قبل النوم.',
    coverEmoji: '🌙',
    accentColor: 'sky',
    orderIndex: 2,
    textEn:
      'It is night. Luna looks up. The moon is big and round. Luna whispers, Good night, Moon. Sleep well. Sweet dreams.',
    textAr:
      'إنه الليل. لونا تنظر إلى الأعلى. القمر كبير ومستدير. لونا تهمس: تصبح على خير يا قمر. نم جيداً. أحلام سعيدة.',
    cuesEn: cuesFromChunks([
      'It is night.',
      'Luna looks up.',
      'The moon is big and round.',
      'Luna whispers, Good night, Moon.',
      'Sleep well.',
      'Sweet dreams.',
    ]),
    cuesAr: cuesFromChunks([
      'إنه الليل.',
      'لونا تنظر إلى الأعلى.',
      'القمر كبير ومستدير.',
      'لونا تهمس: تصبح على خير يا قمر.',
      'نم جيداً.',
      'أحلام سعيدة.',
    ]),
    durationSec: 16,
  },
]

export async function seedKidsStories(prisma: PrismaClient) {
  console.log('📖 Seeding kids stories...')

  for (const story of stories) {
    const data = {
      titleEn: story.titleEn,
      titleAr: story.titleAr,
      summaryEn: story.summaryEn,
      summaryAr: story.summaryAr,
      coverEmoji: story.coverEmoji,
      coverUrl: story.coverUrl ?? null,
      audioUrl: story.audioUrl ?? null,
      textEn: story.textEn,
      textAr: story.textAr,
      cuesEn: story.cuesEn as unknown as Prisma.InputJsonValue,
      cuesAr: story.cuesAr as unknown as Prisma.InputJsonValue,
      accentColor: story.accentColor,
      orderIndex: story.orderIndex,
      durationSec: story.durationSec,
      isActive: true,
    }

    await prisma.kidsStory.upsert({
      where: { id: story.id },
      create: { id: story.id, ...data },
      // Preserve audioUrl/coverUrl if already set by admin uploads
      update: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        summaryEn: data.summaryEn,
        summaryAr: data.summaryAr,
        coverEmoji: data.coverEmoji,
        textEn: data.textEn,
        textAr: data.textAr,
        cuesEn: data.cuesEn,
        cuesAr: data.cuesAr,
        accentColor: data.accentColor,
        orderIndex: data.orderIndex,
        durationSec: data.durationSec,
        isActive: true,
      },
    })
  }

  console.log(`  ✓ ${stories.length} kids stories seeded`)
}
