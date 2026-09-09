/**
 * Moajam Kids listen-along stories.
 * Cues are timed for a gentle kids narration pace (~2.2 words/sec).
 * audioUrl is left null until real narration assets are uploaded via admin
 * or generated with kids:generate-stories-audio.
 */
import { Prisma, PrismaClient } from '@prisma/client'

export type KidsStoryCue = { start: number; end: number; text: string }

export type KidsStoryPageSeed = {
  textEn: string
  textAr: string
  imageUrl?: string | null
  icon?: string | null
}

export type KidsStorySeed = {
  id: string
  titleEn: string
  titleAr: string
  summaryEn: string
  summaryAr: string
  coverEmoji: string
  coverUrl: string
  audioUrl?: string | null
  pages: KidsStoryPageSeed[]
  accentColor: string
  orderIndex: number
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

function durationFromCues(cues: KidsStoryCue[]): number {
  return Math.ceil((cues.at(-1)?.end ?? 0) + 1)
}

function storyText(story: KidsStorySeed, lang: 'en' | 'ar'): string {
  return story.pages.map((page) => (lang === 'ar' ? page.textAr : page.textEn)).join(' ')
}

const img = (name: string) => `/images/kids/stories/${name}.svg`

const stories: KidsStorySeed[] = [
  {
    id: 'sara-and-the-sun',
    titleEn: 'Sara and the Sun',
    titleAr: 'سارة والشمس',
    summaryEn: 'Sara greets the morning sun and learns a sunny hello.',
    summaryAr: 'سارة ترحّب بشمس الصباح وتتعلم تحية مشرقة.',
    coverEmoji: '☀️',
    coverUrl: img('sara-and-the-sun'),
    accentColor: 'yellow',
    orderIndex: 0,
    pages: [
      {
        icon: '🪟',
        imageUrl: img('sara-and-the-sun'),
        textEn: 'Good morning, Sun! Sara opens the window.',
        textAr: 'صباح الخير يا شمس! سارة تفتح النافذة.',
      },
      {
        icon: '☀️',
        imageUrl: img('sara-and-the-sun'),
        textEn: 'A warm yellow light dances on her blanket.',
        textAr: 'ضوء أصفر دافئ يرقص فوق بطانيتها.',
      },
      {
        icon: '🌻',
        imageUrl: img('sara-and-the-sun'),
        textEn: 'Sara waves to the flowers in the garden.',
        textAr: 'سارة تلوّح للزهور في الحديقة.',
      },
      {
        icon: '👋',
        imageUrl: img('sara-and-the-sun'),
        textEn: 'She says, Hello, bright Sun. Thank you for today.',
        textAr: 'تقول: مرحباً أيتها الشمس المشرقة. شكراً على هذا اليوم.',
      },
      {
        icon: '😊',
        imageUrl: img('sara-and-the-sun'),
        textEn: 'The morning feels happy, and Sara feels brave.',
        textAr: 'يشعر الصباح بالسعادة، وتشعر سارة بالشجاعة.',
      },
    ],
  },
  {
    id: 'omar-and-the-cat',
    titleEn: 'Omar and the Cat',
    titleAr: 'عمر والقطة',
    summaryEn: 'Omar meets a soft cat and practices kind words.',
    summaryAr: 'عمر يلتقي قطة ناعمة ويتدرّب على كلمات لطيفة.',
    coverEmoji: '🐱',
    coverUrl: img('omar-and-the-cat'),
    accentColor: 'pink',
    orderIndex: 1,
    pages: [
      {
        icon: '🐾',
        imageUrl: img('omar-and-the-cat'),
        textEn: 'Omar hears a tiny meow behind the blue gate.',
        textAr: 'عمر يسمع مواءً صغيراً خلف البوابة الزرقاء.',
      },
      {
        icon: '🐱',
        imageUrl: img('omar-and-the-cat'),
        textEn: 'A soft kitten peeks out and blinks at him.',
        textAr: 'قطة صغيرة ناعمة تطل وتغمز له بعينيها.',
      },
      {
        icon: '🥛',
        imageUrl: img('omar-and-the-cat'),
        textEn: 'Omar brings water and says, Here you go, little friend.',
        textAr: 'عمر يحضر الماء ويقول: تفضلي يا صديقتي الصغيرة.',
      },
      {
        icon: '🤲',
        imageUrl: img('omar-and-the-cat'),
        textEn: 'He uses gentle hands and a gentle voice.',
        textAr: 'يستخدم يديه بلطف وصوته بلطف.',
      },
      {
        icon: '😺',
        imageUrl: img('omar-and-the-cat'),
        textEn: 'The kitten purrs, and Omar learns that kindness is warm.',
        textAr: 'تخرخر القطة، ويتعلم عمر أن اللطف دافئ.',
      },
    ],
  },
  {
    id: 'luna-and-the-moon',
    titleEn: 'Luna and the Moon',
    titleAr: 'لونا والقمر',
    summaryEn: 'Luna looks at the moon and whispers a bedtime wish.',
    summaryAr: 'لونا تنظر إلى القمر وتهمس بأمنية قبل النوم.',
    coverEmoji: '🌙',
    coverUrl: img('luna-and-the-moon'),
    accentColor: 'sky',
    orderIndex: 2,
    pages: [
      {
        icon: '🌃',
        imageUrl: img('luna-and-the-moon'),
        textEn: 'It is night, and Luna puts on her cozy socks.',
        textAr: 'إنه الليل، ولونا ترتدي جواربها الدافئة.',
      },
      {
        icon: '🌙',
        imageUrl: img('luna-and-the-moon'),
        textEn: 'The moon is round like a cookie in the sky.',
        textAr: 'القمر مستدير مثل بسكويتة في السماء.',
      },
      {
        icon: '⭐',
        imageUrl: img('luna-and-the-moon'),
        textEn: 'Luna counts three stars and smiles softly.',
        textAr: 'لونا تعد ثلاث نجمات وتبتسم بهدوء.',
      },
      {
        icon: '🛏️',
        imageUrl: img('luna-and-the-moon'),
        textEn: 'She whispers, Good night, Moon. Watch my dreams.',
        textAr: 'تهمس: تصبح على خير يا قمر. احرس أحلامي.',
      },
      {
        icon: '💤',
        imageUrl: img('luna-and-the-moon'),
        textEn: 'The room becomes quiet, and sweet dreams arrive.',
        textAr: 'تصبح الغرفة هادئة، وتصل الأحلام الجميلة.',
      },
    ],
  },
  {
    id: 'zayd-rainbow-garden',
    titleEn: 'Zayd and the Rainbow Garden',
    titleAr: 'زيد وحديقة قوس قزح',
    summaryEn: 'Zayd waters tiny seeds and discovers colors after rain.',
    summaryAr: 'زيد يسقي بذوراً صغيرة ويكتشف الألوان بعد المطر.',
    coverEmoji: '🌈',
    coverUrl: img('zayd-rainbow-garden'),
    accentColor: 'green',
    orderIndex: 3,
    pages: [
      {
        icon: '🌱',
        imageUrl: img('zayd-rainbow-garden'),
        textEn: 'Zayd plants three tiny seeds beside the path.',
        textAr: 'يزرع زيد ثلاث بذور صغيرة بجانب الممر.',
      },
      {
        icon: '💧',
        imageUrl: img('zayd-rainbow-garden'),
        textEn: 'He gives them water and waits with patient eyes.',
        textAr: 'يسقيها الماء وينتظر بعينين صبورتين.',
      },
      {
        icon: '☔',
        imageUrl: img('zayd-rainbow-garden'),
        textEn: 'A soft rain taps, tap, tap on the leaves.',
        textAr: 'مطر لطيف ينقر: طق، طق، طق على الأوراق.',
      },
      {
        icon: '🌈',
        imageUrl: img('zayd-rainbow-garden'),
        textEn: 'When the sun returns, a rainbow bends over the garden.',
        textAr: 'عندما تعود الشمس، ينحني قوس قزح فوق الحديقة.',
      },
      {
        icon: '🌼',
        imageUrl: img('zayd-rainbow-garden'),
        textEn: 'The seeds grow into red, blue, and yellow flowers.',
        textAr: 'تنمو البذور أزهاراً حمراء وزرقاء وصفراء.',
      },
      {
        icon: '👏',
        imageUrl: img('zayd-rainbow-garden'),
        textEn: 'Zayd claps and says, Small care can make big color.',
        textAr: 'يصفق زيد ويقول: العناية الصغيرة تصنع ألواناً كبيرة.',
      },
    ],
  },
  {
    id: 'noura-little-boat',
    titleEn: 'Noura and the Little Boat',
    titleAr: 'نورة والقارب الصغير',
    summaryEn: 'Noura helps a paper boat find its way across a puddle.',
    summaryAr: 'نورة تساعد قارباً ورقياً ليعبر بركة صغيرة.',
    coverEmoji: '⛵',
    coverUrl: img('noura-little-boat'),
    accentColor: 'blue',
    orderIndex: 4,
    pages: [
      {
        icon: '📄',
        imageUrl: img('noura-little-boat'),
        textEn: 'Noura folds a paper boat with careful fingers.',
        textAr: 'تطوي نورة قارباً ورقياً بأصابع حذرة.',
      },
      {
        icon: '💦',
        imageUrl: img('noura-little-boat'),
        textEn: 'She places it in a puddle after the rain.',
        textAr: 'تضعه في بركة صغيرة بعد المطر.',
      },
      {
        icon: '🌬️',
        imageUrl: img('noura-little-boat'),
        textEn: 'A small wind blows, and the boat wiggles forward.',
        textAr: 'تهب ريح صغيرة، ويتمايل القارب إلى الأمام.',
      },
      {
        icon: '🪨',
        imageUrl: img('noura-little-boat'),
        textEn: 'A pebble blocks the way, so Noura moves it aside.',
        textAr: 'حصاة تسد الطريق، فتحركها نورة جانباً.',
      },
      {
        icon: '⛵',
        imageUrl: img('noura-little-boat'),
        textEn: 'The little boat sails across like a brave captain.',
        textAr: 'يبحر القارب الصغير مثل قائد شجاع.',
      },
    ],
  },
  {
    id: 'mimi-lost-star',
    titleEn: 'Mimi Finds a Lost Star',
    titleAr: 'ميمي تجد نجمة ضائعة',
    summaryEn: 'Mimi follows a sparkle and learns how to ask for help.',
    summaryAr: 'ميمي تتبع بريقاً وتتعلم كيف تطلب المساعدة.',
    coverEmoji: '⭐',
    coverUrl: img('mimi-lost-star'),
    accentColor: 'purple',
    orderIndex: 5,
    pages: [
      {
        icon: '✨',
        imageUrl: img('mimi-lost-star'),
        textEn: 'Mimi sees a sparkle under the kitchen chair.',
        textAr: 'ترى ميمي بريقاً تحت كرسي المطبخ.',
      },
      {
        icon: '⭐',
        imageUrl: img('mimi-lost-star'),
        textEn: 'It is a tiny star with a sleepy silver face.',
        textAr: 'إنها نجمة صغيرة بوجه فضي نعسان.',
      },
      {
        icon: '❓',
        imageUrl: img('mimi-lost-star'),
        textEn: 'Mimi asks, Are you lost? The star nods.',
        textAr: 'تسأل ميمي: هل أنت ضائعة؟ تهز النجمة رأسها.',
      },
      {
        icon: '🪜',
        imageUrl: img('mimi-lost-star'),
        textEn: 'Dad brings a ladder, and Mom opens the window.',
        textAr: 'يحضر أبي سلماً، وتفتح أمي النافذة.',
      },
      {
        icon: '🌌',
        imageUrl: img('mimi-lost-star'),
        textEn: 'Together they lift the star back to the sky.',
        textAr: 'معاً يرفعون النجمة إلى السماء من جديد.',
      },
      {
        icon: '💛',
        imageUrl: img('mimi-lost-star'),
        textEn: 'Mimi waves and remembers: helpers make the dark bright.',
        textAr: 'تلوّح ميمي وتتذكر: المساعدون يجعلون الظلام مضيئاً.',
      },
    ],
  },
  {
    id: 'tariq-cookie-cloud',
    titleEn: 'Tariq and the Cookie Cloud',
    titleAr: 'طارق وسحابة البسكويت',
    summaryEn: 'Tariq shares pretend cookies with friends in the park.',
    summaryAr: 'طارق يشارك بسكويتاً خيالياً مع أصدقائه في الحديقة.',
    coverEmoji: '🍪',
    coverUrl: img('tariq-cookie-cloud'),
    accentColor: 'orange',
    orderIndex: 6,
    pages: [
      {
        icon: '☁️',
        imageUrl: img('tariq-cookie-cloud'),
        textEn: 'Tariq looks up and sees a cloud shaped like a cookie.',
        textAr: 'ينظر طارق إلى الأعلى ويرى سحابة على شكل بسكويتة.',
      },
      {
        icon: '🍪',
        imageUrl: img('tariq-cookie-cloud'),
        textEn: 'He laughs and says, One cookie for everyone!',
        textAr: 'يضحك ويقول: بسكويتة واحدة للجميع!',
      },
      {
        icon: '🧺',
        imageUrl: img('tariq-cookie-cloud'),
        textEn: 'His friends sit on the grass with an empty picnic basket.',
        textAr: 'يجلس أصدقاؤه على العشب ومعهم سلة نزهة فارغة.',
      },
      {
        icon: '🎭',
        imageUrl: img('tariq-cookie-cloud'),
        textEn: 'They pretend to pass sweet cloud cookies around.',
        textAr: 'يتظاهرون بتمرير بسكويت السحاب الحلو بينهم.',
      },
      {
        icon: '🤝',
        imageUrl: img('tariq-cookie-cloud'),
        textEn: 'Tariq learns that sharing makes pretend games bigger.',
        textAr: 'يتعلم طارق أن المشاركة تجعل ألعاب الخيال أكبر.',
      },
    ],
  },
  {
    id: 'hana-brave-bunny',
    titleEn: 'Hana and the Brave Bunny',
    titleAr: 'هنا والأرنب الشجاع',
    summaryEn: 'Hana helps a shy bunny hop over a tiny bridge.',
    summaryAr: 'هنا تساعد أرنباً خجولاً ليقفز فوق جسر صغير.',
    coverEmoji: '🐰',
    coverUrl: img('hana-brave-bunny'),
    accentColor: 'sky',
    orderIndex: 7,
    pages: [
      {
        icon: '🐰',
        imageUrl: img('hana-brave-bunny'),
        textEn: 'Hana finds a bunny waiting beside a tiny bridge.',
        textAr: 'تجد هنا أرنباً ينتظر بجانب جسر صغير.',
      },
      {
        icon: '🌉',
        imageUrl: img('hana-brave-bunny'),
        textEn: 'The bridge is short, but the bunny feels worried.',
        textAr: 'الجسر قصير، لكن الأرنب يشعر بالقلق.',
      },
      {
        icon: '🎵',
        imageUrl: img('hana-brave-bunny'),
        textEn: 'Hana sings a quiet hopping song: one, two, hop.',
        textAr: 'تغني هنا أغنية قفز هادئة: واحد، اثنان، اقفز.',
      },
      {
        icon: '🐾',
        imageUrl: img('hana-brave-bunny'),
        textEn: 'The bunny hops once, then twice, then all the way across.',
        textAr: 'يقفز الأرنب مرة، ثم مرتين، ثم يعبر الطريق كله.',
      },
      {
        icon: '🏅',
        imageUrl: img('hana-brave-bunny'),
        textEn: 'Hana cheers, and the bunny feels brave inside.',
        textAr: 'تهلل هنا، ويشعر الأرنب بالشجاعة في قلبه.',
      },
    ],
  },
]

export async function seedKidsStories(prisma: PrismaClient) {
  console.log('📖 Seeding kids stories...')

  for (const story of stories) {
    const textEn = storyText(story, 'en')
    const textAr = storyText(story, 'ar')
    const cuesEn = cuesFromChunks(story.pages.map((page) => page.textEn))
    const cuesAr = cuesFromChunks(story.pages.map((page) => page.textAr))
    const durationSec = Math.max(durationFromCues(cuesEn), durationFromCues(cuesAr))

    const data = {
      titleEn: story.titleEn,
      titleAr: story.titleAr,
      summaryEn: story.summaryEn,
      summaryAr: story.summaryAr,
      coverEmoji: story.coverEmoji,
      coverUrl: story.coverUrl,
      audioUrl: story.audioUrl ?? null,
      textEn,
      textAr,
      cuesEn: cuesEn as unknown as Prisma.InputJsonValue,
      cuesAr: cuesAr as unknown as Prisma.InputJsonValue,
      accentColor: story.accentColor,
      orderIndex: story.orderIndex,
      durationSec,
      isActive: true,
    }

    await prisma.kidsStory.upsert({
      where: { id: story.id },
      create: { id: story.id, ...data },
      // Preserve audioUrl if already set by admin uploads/audio generation.
      update: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        summaryEn: data.summaryEn,
        summaryAr: data.summaryAr,
        coverEmoji: data.coverEmoji,
        coverUrl: data.coverUrl,
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

    await prisma.kidsStoryPage.deleteMany({ where: { storyId: story.id } })
    await prisma.kidsStoryPage.createMany({
      data: story.pages.map((page, index) => ({
        storyId: story.id,
        orderIndex: index,
        textEn: page.textEn,
        textAr: page.textAr,
        imageUrl: page.imageUrl ?? null,
        icon: page.icon ?? null,
      })),
    })
  }

  console.log(`  ✓ ${stories.length} kids stories seeded`)
}
