/**
 * Moajam Kids stories - bulk TTS narration generation.
 *
 * Run locally:
 *   npm run kids:generate-stories-audio -- --lang ar --force --delay-ms 3000
 *
 * Run in the Docker API container:
 *   docker exec -it $CID npm run kids:generate-stories-audio -- --lang ar --force --delay-ms 3000
 *
 * Output:
 *   <out>/stories/en/<story-id>.mp3  (Deepgram in auto mode)
 *   <out>/stories/ar/<story-id>.wav  (OpenRouter Gemini in auto mode)
 *
 * Default output follows scripts/generate-kids-audio.ts:
 *   Local sibling repos: ../mujam/public/audio/kids
 *   Docker/prod API container: /app/uploads/audio/kids
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

type Lang = 'en' | 'ar';
type LangMode = Lang | 'all';
type TtsProviderMode = 'deepgram' | 'openrouter' | 'auto';
type ResolveTtsProvider = (
  lang: Lang,
  providerOverride?: TtsProviderMode
) => 'deepgram' | 'openrouter';

type KidsStoryRow = {
  id: string;
  titleEn: string;
  titleAr: string;
  textEn: string;
  textAr: string;
  isActive: boolean;
};

type FailedStory = {
  lang: Lang;
  storyId: string;
  title: string;
  error: string;
};

interface FailedStoriesFile {
  failedAt: string;
  stories: Array<{ lang: Lang; storyId: string; title: string }>;
}

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const DEV_SIBLING_OUT = path.resolve(__dirname, '../../mujam/public/audio/kids');
const DOCKER_UPLOADS_OUT = '/app/uploads/audio/kids';
const PUBLIC_AUDIO_PREFIX = '/audio/kids/stories';
const DELAY_MS_DEEPGRAM = 250;
const DELAY_MS_OPENROUTER = 1500;

function canWriteToDir(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.write-probe');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/** Dev sibling repo layout, else Docker uploads volume (writable in prod container). */
function resolveDefaultOutDir(): string {
  if (process.env.KIDS_STORIES_AUDIO_OUT) {
    return path.resolve(process.env.KIDS_STORIES_AUDIO_OUT);
  }
  if (process.env.KIDS_AUDIO_OUT) {
    return path.resolve(process.env.KIDS_AUDIO_OUT);
  }

  const siblingMujam = path.resolve(__dirname, '../../mujam');
  if (fs.existsSync(siblingMujam) && canWriteToDir(DEV_SIBLING_OUT)) {
    return DEV_SIBLING_OUT;
  }

  return DOCKER_UPLOADS_OUT;
}

function printHelp() {
  console.log(`
Moajam Kids stories audio generator

Usage:
  npm run kids:generate-stories-audio [-- options]

Options:
  --lang <en|ar|all>       Language(s) to generate (default: all)
  --provider <mode>        TTS backend: deepgram | openrouter | auto (default: auto)
  --out <dir>              Output root (default: auto - see KIDS_STORIES_AUDIO_OUT / KIDS_AUDIO_OUT)
  --force                  Overwrite existing audio files
  --dry-run                Print stories only, no API calls
  --delay <ms>             Pause between API calls (default: 1500 OpenRouter / 250 Deepgram)
  --delay-ms <ms>          Alias for --delay
  --retry-failed           Re-generate stories listed in <out>/failed-stories.json
  --no-db-update           Do not update KidsStory.audioUrl after single-language generation
  --help                   Show this help

Provider selection (auto - recommended for production):
  en -> Deepgram Aura (MP3)
  ar -> OpenRouter Gemini (WAV - Gemini returns PCM only)

Docker:
  docker exec -it $CID npm run kids:generate-stories-audio -- --lang ar --force --delay-ms 3000

Output URL convention:
  /audio/kids/stories/en/<story-id>.mp3
  /audio/kids/stories/ar/<story-id>.wav
`);
}

function resolveBulkProvider(
  lang: Lang,
  providerOverride: TtsProviderMode | undefined,
  langMode: LangMode
): TtsProviderMode | undefined {
  if (!providerOverride || providerOverride === 'auto') {
    return providerOverride;
  }
  if (providerOverride === 'deepgram') {
    return 'deepgram';
  }
  if (lang === 'ar') {
    return 'openrouter';
  }
  if (langMode === 'en') {
    return 'openrouter';
  }
  return 'deepgram';
}

function resolveBulkBackend(
  lang: Lang,
  providerOverride: TtsProviderMode | undefined,
  langMode: LangMode,
  resolveTtsProvider: ResolveTtsProvider
): 'deepgram' | 'openrouter' {
  const bulkProvider = resolveBulkProvider(lang, providerOverride, langMode);
  return resolveTtsProvider(lang, bulkProvider);
}

function defaultDelayMs(
  langs: Lang[],
  langMode: LangMode,
  resolveTtsProvider: ResolveTtsProvider,
  providerOverride?: TtsProviderMode
): number {
  const usesOpenRouter = langs.some(
    (l) => resolveBulkBackend(l, providerOverride, langMode, resolveTtsProvider) === 'openrouter'
  );
  return usesOpenRouter ? DELAY_MS_OPENROUTER : DELAY_MS_DEEPGRAM;
}

function failedStoriesPath(outDir: string): string {
  return path.join(outDir, 'failed-stories.json');
}

function loadRetryFailedStories(outDir: string): FailedStoriesFile['stories'] {
  const filePath = failedStoriesPath(outDir);
  if (!fs.existsSync(filePath)) {
    console.error(`No failed-stories file at ${filePath}. Run a full batch first.`);
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as FailedStoriesFile;
    if (!Array.isArray(parsed.stories) || parsed.stories.length === 0) {
      console.error(`${filePath} has no stories to retry.`);
      process.exit(1);
    }
    return parsed.stories;
  } catch {
    console.error(`Could not parse ${filePath}`);
    process.exit(1);
  }
}

function writeFailedStories(outDir: string, failed: FailedStory[]): void {
  if (failed.length === 0) return;
  const payload: FailedStoriesFile = {
    failedAt: new Date().toISOString(),
    stories: failed.map(({ lang, storyId, title }) => ({ lang, storyId, title })),
  };
  fs.writeFileSync(failedStoriesPath(outDir), JSON.stringify(payload, null, 2));
}

function parseArgs(argv: string[]) {
  let lang: LangMode = 'all';
  let provider: TtsProviderMode | undefined;
  let outDir = resolveDefaultOutDir();
  let force = false;
  let dryRun = false;
  let delayMs: number | undefined;
  let retryFailed = false;
  let updateDb = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--lang' && argv[i + 1]) {
      const v = argv[++i] as LangMode;
      if (!['en', 'ar', 'all'].includes(v)) {
        console.error(`Invalid --lang: ${v}`);
        process.exit(1);
      }
      lang = v;
    } else if (arg === '--provider' && argv[i + 1]) {
      const v = argv[++i] as TtsProviderMode;
      if (!['deepgram', 'openrouter', 'auto'].includes(v)) {
        console.error(`Invalid --provider: ${v}`);
        process.exit(1);
      }
      provider = v;
    } else if (arg === '--out' && argv[i + 1]) {
      outDir = path.resolve(argv[++i]);
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if ((arg === '--delay' || arg === '--delay-ms') && argv[i + 1]) {
      delayMs = parseInt(argv[++i], 10);
      if (!Number.isFinite(delayMs) || delayMs < 0) {
        console.error(`Invalid delay: ${argv[i]}`);
        process.exit(1);
      }
    } else if (arg === '--retry-failed') {
      retryFailed = true;
    } else if (arg === '--no-db-update') {
      updateDb = false;
    }
  }

  return { lang, provider, outDir, force, dryRun, delayMs, retryFailed, updateDb };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeStoryId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'story';
}

function storyTitle(story: KidsStoryRow, lang: Lang): string {
  return lang === 'ar' ? story.titleAr : story.titleEn;
}

function storyText(story: KidsStoryRow, lang: Lang): string {
  const title = storyTitle(story, lang).trim();
  const body = (lang === 'ar' ? story.textAr : story.textEn).trim();
  return [title, body].filter(Boolean).join(lang === 'ar' ? '. ' : '. ');
}

function publicStoryAudioUrl(storyId: string, lang: Lang, extension: 'mp3' | 'wav'): string {
  return `${PUBLIC_AUDIO_PREFIX}/${lang}/${safeStoryId(storyId)}.${extension}`;
}

function validateEnvForLangs(
  langs: Lang[],
  langMode: LangMode,
  resolveTtsProvider: ResolveTtsProvider,
  providerOverride?: TtsProviderMode
) {
  const needsDeepgram = langs.some(
    (l) => resolveBulkBackend(l, providerOverride, langMode, resolveTtsProvider) === 'deepgram'
  );
  const needsOpenRouter = langs.some(
    (l) => resolveBulkBackend(l, providerOverride, langMode, resolveTtsProvider) === 'openrouter'
  );

  if (needsDeepgram && !process.env.DEEPGRAM_API_KEY) {
    console.error('DEEPGRAM_API_KEY is not set (required for English / deepgram provider).');
    process.exit(1);
  }
  if (needsOpenRouter && !process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set (required for Arabic / openrouter provider).');
    process.exit(1);
  }
}

async function updateStoryAudioUrls(
  urlsByStoryId: Map<string, string>,
  langMode: LangMode,
  retryFailed: boolean
) {
  if (langMode === 'all') {
    console.log('\nSkipping KidsStory.audioUrl update for --lang all (single DB field cannot hold both languages).');
    return;
  }

  if (urlsByStoryId.size === 0) return;

  for (const [storyId, audioUrl] of urlsByStoryId) {
    await prisma.kidsStory.update({
      where: { id: storyId },
      data: { audioUrl },
    });
  }

  const reason = retryFailed ? 'retried story' : 'story';
  console.log(`\nUpdated KidsStory.audioUrl for ${urlsByStoryId.size} ${reason}(s) to ${langMode.toUpperCase()} audio.`);
}

async function generateForLang(
  stories: KidsStoryRow[],
  lang: Lang,
  langMode: LangMode,
  resolveTtsProvider: ResolveTtsProvider,
  providerOverride: TtsProviderMode | undefined,
  outDir: string,
  force: boolean,
  delayMs: number,
  manifest: Record<string, string>,
  generatedUrls: Map<string, string>,
  usageUserId: string | undefined,
  textToSpeechForKids: (
    text: string,
    lang: Lang,
    userId?: string,
    options?: { provider?: TtsProviderMode; bulk?: boolean }
  ) => Promise<{ buffer: Buffer; extension: 'mp3' | 'wav'; provider: string }>
): Promise<{ created: number; skipped: number; failed: FailedStory[] }> {
  const bulkProvider = resolveBulkProvider(lang, providerOverride, langMode);
  const provider = resolveBulkBackend(lang, providerOverride, langMode, resolveTtsProvider);
  const ext = provider === 'openrouter' ? 'wav' : 'mp3';
  const langDir = path.join(outDir, 'stories', lang);
  fs.mkdirSync(langDir, { recursive: true });

  let created = 0;
  let skipped = 0;
  const failed: FailedStory[] = [];
  const providerLabel = provider === 'openrouter' ? 'OpenRouter Gemini -> WAV' : 'Deepgram -> MP3';

  console.log(`\n${lang.toUpperCase()} stories -> ${langDir} (${providerLabel})\n`);

  for (const story of stories) {
    const slug = safeStoryId(story.id);
    const expectedFilePath = path.join(langDir, `${slug}.${ext}`);
    const url = publicStoryAudioUrl(story.id, lang, ext);
    const text = storyText(story, lang);
    manifest[`${lang}:${story.id}`] = url;

    if (!force && fs.existsSync(expectedFilePath)) {
      skipped++;
      generatedUrls.set(story.id, url);
      continue;
    }

    try {
      process.stdout.write(`  [${lang}] "${storyTitle(story, lang)}" -> ${slug}.${ext} ... `);
      const result = await textToSpeechForKids(text, lang, usageUserId, {
        provider: bulkProvider,
        bulk: true,
      });
      const filePath = path.join(langDir, `${slug}.${result.extension}`);
      fs.writeFileSync(filePath, result.buffer);
      created++;
      const actualUrl = publicStoryAudioUrl(story.id, lang, result.extension);
      generatedUrls.set(story.id, actualUrl);
      manifest[`${lang}:${story.id}`] = actualUrl;
      console.log('ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ lang, storyId: story.id, title: storyTitle(story, lang), error: msg });
      console.log(`failed: ${msg}`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  return { created, skipped, failed };
}

function printFailedSummary(failed: FailedStory[], outDir: string) {
  if (failed.length === 0) return;

  console.log(`\n${failed.length} story audio item(s) still failed:`);
  for (const { lang, storyId, title, error } of failed) {
    console.log(`   - [${lang}] ${storyId} "${title}" - ${error}`);
  }

  writeFailedStories(outDir, failed);
  const langSet = [...new Set(failed.map((f) => f.lang))];
  const langFlag = langSet.length === 1 ? ` --lang ${langSet[0]}` : '';

  console.log(`\nFailed stories saved to ${failedStoriesPath(outDir)}`);
  console.log('Retry only failures (production Docker):');
  console.log(`  docker exec -it $CID npm run kids:generate-stories-audio -- --retry-failed${langFlag} --force`);
  console.log('Local retry:');
  console.log(`  npm run kids:generate-stories-audio -- --retry-failed${langFlag} --force`);
}

async function main() {
  const { lang, provider, outDir, force, dryRun, delayMs: delayOverride, retryFailed, updateDb } =
    parseArgs(process.argv.slice(2));

  const allStories = await prisma.kidsStory.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, titleEn: true, titleAr: true, textEn: true, textAr: true, isActive: true },
  });

  const retryStories = retryFailed ? loadRetryFailedStories(outDir) : null;
  const langs: Lang[] = retryStories
    ? ([...new Set(retryStories.map((s) => s.lang))] as Lang[])
    : lang === 'all'
      ? ['en', 'ar']
      : [lang];

  const storiesByLang = (l: Lang): KidsStoryRow[] => {
    if (!retryStories) return allStories;
    const ids = new Set(retryStories.filter((s) => s.lang === l).map((s) => s.storyId));
    return allStories.filter((s) => ids.has(s.id));
  };

  console.log(`\nMoajam Kids stories audio - ${allStories.length} active stories`);
  console.log(`Output directory: ${outDir}`);

  if (dryRun) {
    for (const l of langs) {
      console.log(`\n${l.toUpperCase()}:`);
      storiesByLang(l).forEach((s) => console.log(`  - ${s.id}: ${storyTitle(s, l)}`));
    }
    console.log('\n(dry-run - no files written)');
    return;
  }

  const tts = await import('../dist/services/ai/tts.service');
  const usage = await import('../dist/services/ai/usage.service');
  const { resolveTtsProvider, textToSpeechForKids, assertAuraEnglishVoice, getKidsEnglishTtsSpeed } = tts;
  const { resolveUsageUserId } = usage;

  validateEnvForLangs(langs, lang, resolveTtsProvider, provider);

  const resolvedDelay = delayOverride ?? defaultDelayMs(langs, lang, resolveTtsProvider, provider);
  console.log(`Request delay: ${resolvedDelay}ms between calls`);

  if (langs.includes('en')) {
    const enSpeed = getKidsEnglishTtsSpeed();
    console.log(`Kids EN TTS speed: ${enSpeed} (Deepgram Aura-2 min 0.7)`);
  }

  if (langs.includes('en') && resolveBulkBackend('en', provider, lang, resolveTtsProvider) === 'deepgram') {
    const enVoice = process.env.AI_TTS_VOICE_EN || 'aura-asteria-en';
    try {
      assertAuraEnglishVoice(enVoice);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(msg);
      process.exit(1);
    }
  }

  const usageUserId = await resolveUsageUserId();
  if (!usageUserId) {
    console.warn(
      'No system user for usage logs - bulk TTS will not appear in admin budget. Set AI_USAGE_SYSTEM_USER_ID or seed SUPER_ADMIN_EMAIL.'
    );
  } else {
    console.log(`Usage logs -> user ${usageUserId}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const manifest: Record<string, string> = {};
  const generatedUrls = new Map<string, string>();
  const allFailed: FailedStory[] = [];
  let totalCreated = 0;
  let totalSkipped = 0;

  for (const l of langs) {
    const stories = storiesByLang(l);
    if (stories.length === 0) continue;

    const stats = await generateForLang(
      stories,
      l,
      lang,
      resolveTtsProvider,
      provider,
      outDir,
      force || !!retryStories,
      resolvedDelay,
      manifest,
      generatedUrls,
      usageUserId,
      textToSpeechForKids
    );

    totalCreated += stats.created;
    totalSkipped += stats.skipped;
    let langFailed = stats.failed;

    if (stats.failed.length > 0) {
      const retryDelay = Math.max(resolvedDelay * 3, DELAY_MS_OPENROUTER * 2);
      console.log(`\nSecond pass for ${stats.failed.length} failed [${l}] story item(s) (delay ${retryDelay}ms)...`);
      const retrySet = new Set(stats.failed.map((f) => f.storyId));
      const retryStats = await generateForLang(
        stories.filter((s) => retrySet.has(s.id)),
        l,
        lang,
        resolveTtsProvider,
        provider,
        outDir,
        true,
        retryDelay,
        manifest,
        generatedUrls,
        usageUserId,
        textToSpeechForKids
      );
      totalCreated += retryStats.created;
      console.log(`\nRetry: ${retryStats.created} recovered, ${retryStats.failed.length} still failed`);
      langFailed = retryStats.failed;
    }

    allFailed.push(...langFailed);
    console.log(`\n${l.toUpperCase()} created: ${stats.created}, skipped: ${stats.skipped}, failed: ${langFailed.length}`);
  }

  if (updateDb && lang !== 'all') {
    await updateStoryAudioUrls(generatedUrls, lang, !!retryStories);
  }

  if (allFailed.length > 0) {
    process.exitCode = 1;
    printFailedSummary(allFailed, outDir);
  } else if (fs.existsSync(failedStoriesPath(outDir))) {
    fs.unlinkSync(failedStoriesPath(outDir));
  }

  const manifestPath = path.join(outDir, 'stories-manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        storyCount: allStories.length,
        ttsProvider: provider || process.env.TTS_PROVIDER || 'auto',
        files: manifest,
      },
      null,
      2
    )
  );

  console.log(`\nManifest: ${manifestPath}`);
  console.log(
    `Done (${totalCreated} created, ${totalSkipped} skipped${allFailed.length ? `, ${allFailed.length} failed` : ''}).`
  );
  console.log('Deploy note: generated files must be served at /audio/kids/stories for the kids story player.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
