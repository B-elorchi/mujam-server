/**
 * Moajam Kids — bulk TTS audio generation (optional; on-demand TTS works without this).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION 1 — On-demand (recommended for moajam-dev)
 * ═══════════════════════════════════════════════════════════════════════════════
 * No pre-generation needed. Set in mujam-server/.env (or Docker .env):
 *
 *   DEEPGRAM_API_KEY=your_key
 *   OPENROUTER_API_KEY=your_key          # required for Arabic TTS
 *   TTS_PROVIDER=auto                    # deepgram for EN, OpenRouter Gemini for AR
 *   AI_TTS_VOICE_EN=aura-2-thalia-en     # Aura-2 required for speed control (0.7–1.5)
 *   KIDS_TTS_SPEED_EN=0.5                # Kids English speed (Deepgram clamps to 0.7 min)
 *   OPENROUTER_TTS_MODEL=google/gemini-3.1-flash-tts-preview
 *   OPENROUTER_TTS_VOICE_AR=Zephyr       # Gemini prebuilt voice
 *
 * When a child taps Listen, the frontend calls:
 *   GET /api/kids/audio?text=<word>&lang=en|ar
 * Providers generate audio on first request; the server caches up to 500 clips in
 * memory and sends Cache-Control: max-age=86400. Browser speech is fallback if
 * TTS fails.
 *
 * Fallback chain (client): static file → API (OpenRouter/Deepgram) → browser speech
 *
 * Alphabet letters use phonetic names (A → "ay", B → "bee", …) — see
 * mujam/src/kids/audio.ts LETTER_PHONETICS (same map in scripts/kids-audio-terms.ts).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION 2 — Bulk pre-generate static audio (offline / CDN / faster first play)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   cd mujam-server
 *   npm run kids:generate-audio                              # EN (Deepgram) + AR (OpenRouter) — default auto
 *   npm run kids:generate-audio -- --lang ar --provider openrouter --force
 *   npm run kids:generate-audio -- --retry-failed --lang ar --force   # retry failed-terms.json (AR)
 *   npm run kids:generate-audio -- --lang en --force       # re-generate EN MP3s after speed change
 *   npm run kids:generate-audio -- --dry-run                 # list terms only
 *
 * Production (Docker API container — do NOT pass --provider openrouter with --lang all):
 *   docker exec -it $CID npm run kids:generate-audio
 *   docker exec -it $CID npm run kids:generate-audio -- --retry-failed --lang ar --force
 *
 * Output (default path depends on environment — see resolveDefaultOutDir):
 *   <out>/en/<slug>.mp3   (Deepgram)
 *   <out>/ar/<slug>.wav   (OpenRouter Gemini — PCM wrapped as WAV)
 *   <out>/manifest.json
 *
 *   Local dev (sibling repos): ../mujam/public/audio/kids
 *   Docker / prod API container: /app/uploads/audio/kids (writable uploads volume)
 *   Override anytime: KIDS_AUDIO_OUT or --out <dir>
 *
 * The frontend (mujam/src/kids/audio.ts) checks static .mp3/.wav first, then falls
 * back to the on-demand API. After generating in Docker, copy/sync files to the
 * frontend public tree (mujam/public/audio/kids) and rebuild/deploy, or serve them
 * from uploads if your stack exposes that path statically.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Cost / limits
 * ═══════════════════════════════════════════════════════════════════════════════
 * Deepgram Aura: ~$0.015 / 1k chars (English).
 * OpenRouter Gemini 3.1 Flash TTS: ~$1 / 1M input chars + audio output tokens.
 * Script waits 1500ms between OpenRouter requests (250ms for Deepgram-only) to reduce rate-limit risk.
 * Usage is logged to AIUsageLog (feature kids_tts_bulk) under the
 * system admin user (SUPER_ADMIN_EMAIL or AI_USAGE_SYSTEM_USER_ID).
 *
 * Run: npx ts-node scripts/generate-kids-audio.ts --help
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  audioSlug,
  collectKidsAudioTerms,
} from './kids-audio-terms';
import type { TtsProviderMode } from '../dist/services/ai/tts.service';

type ResolveTtsProvider = (
  lang: 'en' | 'ar',
  providerOverride?: TtsProviderMode
) => 'deepgram' | 'openrouter';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DEV_SIBLING_OUT = path.resolve(__dirname, '../../mujam/public/audio/kids');
const DOCKER_UPLOADS_OUT = '/app/uploads/audio/kids';
const DELAY_MS_DEEPGRAM = 250;
const DELAY_MS_OPENROUTER = 1500;

type LangMode = 'en' | 'ar' | 'all';

type FailedTerm = { lang: 'en' | 'ar'; term: string; error: string };

interface FailedTermsFile {
  failedAt: string;
  terms: Array<{ lang: 'en' | 'ar'; term: string }>;
}

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
Moajam Kids audio generator

Usage:
  npm run kids:generate-audio [-- options]

Options:
  --lang <en|ar|all>       Language(s) to generate (default: all)
  --provider <mode>        TTS backend: deepgram | openrouter | auto (default: auto)
  --out <dir>              Output root (default: auto — see KIDS_AUDIO_OUT)
  --force                  Overwrite existing audio files
  --dry-run                Print terms only, no API calls
  --delay <ms>             Pause between API calls (default: 1500 OpenRouter / 250 Deepgram)
  --delay-ms <ms>          Alias for --delay
  --retry-failed           Re-generate terms listed in <out>/failed-terms.json
  --help                   Show this help

Environment:
  DEEPGRAM_API_KEY         Required for English (deepgram provider)
  OPENROUTER_API_KEY       Required for Arabic (openrouter / auto for ar)
  TTS_PROVIDER             Server default when --provider omitted (default: auto)
  AI_TTS_VOICE_EN          Deepgram English voice (Aura-2 for speed, e.g. aura-2-thalia-en)
  KIDS_TTS_SPEED_EN        Kids English playback speed (default 0.5; Deepgram min 0.7)
  AI_TTS_SPEED_EN          Alias for KIDS_TTS_SPEED_EN
  OPENROUTER_TTS_MODEL     Gemini TTS model (default google/gemini-3.1-flash-tts-preview)
  OPENROUTER_TTS_VOICE_AR  Gemini voice for Arabic (default Zephyr)
  AI_USAGE_SYSTEM_USER_ID  Optional user id for bulk usage logs (else SUPER_ADMIN_EMAIL)
  KIDS_AUDIO_OUT           Output root (Docker default: /app/uploads/audio/kids)

Provider selection (auto — recommended for production):
  en → Deepgram Aura (MP3)
  ar → OpenRouter Gemini (WAV — Gemini returns PCM only)

  --provider openrouter applies to Arabic only (unless --lang en for testing).
  Do not use --provider openrouter with --lang all — English must use Deepgram.

On-demand alternative: set API keys and skip this script entirely.
`);
}

/**
 * Per-language provider for bulk generation.
 * --provider openrouter targets Arabic only unless --lang en (explicit EN OpenRouter test).
 */
function resolveBulkProvider(
  lang: 'en' | 'ar',
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
  lang: 'en' | 'ar',
  providerOverride: TtsProviderMode | undefined,
  langMode: LangMode,
  resolveTtsProvider: ResolveTtsProvider
): 'deepgram' | 'openrouter' {
  const bulkProvider = resolveBulkProvider(lang, providerOverride, langMode);
  return resolveTtsProvider(lang, bulkProvider);
}

function defaultDelayMs(
  langs: ('en' | 'ar')[],
  langMode: LangMode,
  resolveTtsProvider: ResolveTtsProvider,
  providerOverride?: TtsProviderMode
): number {
  const usesOpenRouter = langs.some(
    (l) => resolveBulkBackend(l, providerOverride, langMode, resolveTtsProvider) === 'openrouter'
  );
  return usesOpenRouter ? DELAY_MS_OPENROUTER : DELAY_MS_DEEPGRAM;
}

function failedTermsPath(outDir: string): string {
  return path.join(outDir, 'failed-terms.json');
}

function loadRetryFailedTerms(outDir: string): Array<{ lang: 'en' | 'ar'; term: string }> | null {
  const filePath = failedTermsPath(outDir);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No failed-terms file at ${filePath}. Run a full batch first.`);
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as FailedTermsFile;
    if (!Array.isArray(parsed.terms) || parsed.terms.length === 0) {
      console.error(`❌ ${filePath} has no terms to retry.`);
      process.exit(1);
    }
    return parsed.terms;
  } catch {
    console.error(`❌ Could not parse ${filePath}`);
    process.exit(1);
  }
}

function writeFailedTerms(outDir: string, failed: FailedTerm[]): void {
  if (failed.length === 0) return;
  const filePath = failedTermsPath(outDir);
  const payload: FailedTermsFile = {
    failedAt: new Date().toISOString(),
    terms: failed.map(({ lang, term }) => ({ lang, term })),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function parseArgs(argv: string[]) {
  let lang: LangMode = 'all';
  let provider: TtsProviderMode | undefined;
  let outDir = resolveDefaultOutDir();
  let force = false;
  let dryRun = false;
  let delayMs: number | undefined;
  let retryFailed = false;

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
    }
  }

  return { lang, provider, outDir, force, dryRun, delayMs, retryFailed };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateForLang(
  terms: string[],
  lang: 'en' | 'ar',
  langMode: LangMode,
  resolveTtsProvider: ResolveTtsProvider,
  providerOverride: TtsProviderMode | undefined,
  outDir: string,
  force: boolean,
  delayMs: number,
  manifest: Record<string, string>,
  usageUserId: string | undefined,
  textToSpeechForKids: (
    text: string,
    lang: 'en' | 'ar',
    userId?: string,
    options?: { provider?: TtsProviderMode; bulk?: boolean }
  ) => Promise<{ buffer: Buffer; extension: 'mp3' | 'wav'; provider: string }>,
  label = ''
): Promise<{ created: number; skipped: number; failed: FailedTerm[] }> {
  const bulkProvider = resolveBulkProvider(lang, providerOverride, langMode);
  const provider = resolveBulkBackend(lang, providerOverride, langMode, resolveTtsProvider);
  const langDir = path.join(outDir, lang);
  fs.mkdirSync(langDir, { recursive: true });

  let created = 0;
  let skipped = 0;
  const failed: FailedTerm[] = [];

  const providerLabel =
    provider === 'openrouter' ? 'OpenRouter Gemini → WAV' : 'Deepgram → MP3';

  if (label) {
    console.log(`\n   ${label}`);
  } else {
    console.log(`   Provider: ${provider} (${providerLabel})`);
  }

  for (const term of terms) {
    const slug = audioSlug(term, lang);
    const ext = provider === 'openrouter' ? 'wav' : 'mp3';
    const filePath = path.join(langDir, `${slug}.${ext}`);
    manifest[`${lang}:${term}`] = `/${lang}/${slug}.${ext}`;

    if (!force && fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  🎵 [${lang}] "${term}" → ${slug}.${ext} … `);
      const result = await textToSpeechForKids(term, lang, usageUserId, {
        provider: bulkProvider,
        bulk: true,
      });
      fs.writeFileSync(filePath, result.buffer);
      created++;
      console.log('✓');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ lang, term, error: msg });
      const hint = /No such model|invalid.*voice/i.test(msg)
        ? ' — check AI_TTS_VOICE_EN or OPENROUTER_TTS_MODEL'
        : '';
      console.log(`✗ ${msg}${hint}`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  return { created, skipped, failed };
}

function printFailedSummary(failed: FailedTerm[], outDir: string) {
  if (failed.length === 0) return;

  console.log(`\n❌ ${failed.length} term(s) still failed:`);
  for (const { lang, term, error } of failed) {
    console.log(`   • [${lang}] "${term}" — ${error}`);
  }

  const failedFile = failedTermsPath(outDir);
  writeFailedTerms(outDir, failed);

  const langSet = [...new Set(failed.map((f) => f.lang))];
  const langFlag = langSet.length === 1 ? ` --lang ${langSet[0]}` : '';

  console.log(`\n📄 Failed terms saved to ${failedFile}`);
  console.log('   Retry only failures (production Docker):');
  console.log(`     docker exec -it $CID npm run kids:generate-audio -- --retry-failed${langFlag} --force`);
  console.log('   Local retry:');
  console.log(`     npm run kids:generate-audio -- --retry-failed${langFlag} --force`);
}

function validateEnvForLangs(
  langs: ('en' | 'ar')[],
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
    console.error('❌ DEEPGRAM_API_KEY is not set (required for English / deepgram provider).');
    process.exit(1);
  }
  if (needsOpenRouter && !process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY is not set (required for Arabic / openrouter provider).');
    process.exit(1);
  }
}

async function main() {
  const { lang, provider, outDir, force, dryRun, delayMs: delayOverride, retryFailed } = parseArgs(
    process.argv.slice(2)
  );
  const { en, ar } = collectKidsAudioTerms();

  console.log(`\n🧒 Moajam Kids audio — ${en.length} EN terms, ${ar.length} AR terms`);
  console.log(`   Output directory: ${outDir}\n`);

  if (dryRun) {
    console.log('English:');
    en.forEach((t) => console.log(`  • ${t}`));
    console.log('\nArabic:');
    ar.forEach((t) => console.log(`  • ${t}`));
    console.log('\n(dry-run — no files written)');
    return;
  }

  const retryTerms = retryFailed ? loadRetryFailedTerms(outDir) : null;
  const langs: ('en' | 'ar')[] = retryTerms
    ? ([...new Set(retryTerms.map((t) => t.lang))] as ('en' | 'ar')[])
    : lang === 'all'
      ? ['en', 'ar']
      : [lang];

  const tts = await import('../dist/services/ai/tts.service');
  const usage = await import('../dist/services/ai/usage.service');
  const {
    resolveTtsProvider,
    textToSpeechForKids,
    assertAuraEnglishVoice,
    getKidsEnglishTtsSpeed,
  } = tts;
  const { resolveUsageUserId } = usage;

  validateEnvForLangs(langs, lang, resolveTtsProvider, provider);

  const resolvedDelay = delayOverride ?? defaultDelayMs(langs, lang, resolveTtsProvider, provider);
  console.log(`   Request delay: ${resolvedDelay}ms between calls`);

  if (langs.includes('en')) {
    const enSpeed = getKidsEnglishTtsSpeed();
    console.log(`   Kids EN TTS speed: ${enSpeed} (Deepgram Aura-2 min 0.7)`);
  }

  if (langs.includes('en') && resolveBulkBackend('en', provider, lang, resolveTtsProvider) === 'deepgram') {
    const enVoice = process.env.AI_TTS_VOICE_EN || 'aura-asteria-en';
    try {
      assertAuraEnglishVoice(enVoice);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ ${msg}`);
      process.exit(1);
    }
  }

  const usageUserId = await resolveUsageUserId();
  if (!usageUserId) {
    console.warn(
      '⚠️  No system user for usage logs — bulk TTS will not appear in admin budget. Set AI_USAGE_SYSTEM_USER_ID or seed SUPER_ADMIN_EMAIL.'
    );
  } else {
    console.log(`   Usage logs → user ${usageUserId}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const manifest: Record<string, string> = {};
  const allFailed: FailedTerm[] = [];
  let totalCreated = 0;
  let totalSkipped = 0;

  const termsByLang = (l: 'en' | 'ar'): string[] => {
    if (retryTerms) {
      return retryTerms.filter((t) => t.lang === l).map((t) => t.term);
    }
    return l === 'en' ? en : ar;
  };

  for (const l of langs) {
    const terms = termsByLang(l);
    if (terms.length === 0) continue;

    console.log(`\n📁 ${l.toUpperCase()} → ${path.join(outDir, l)} (${terms.length} terms)\n`);
    const stats = await generateForLang(
      terms,
      l,
      lang,
      resolveTtsProvider,
      provider,
      outDir,
      force || !!retryTerms,
      resolvedDelay,
      manifest,
      usageUserId,
      textToSpeechForKids
    );
    totalCreated += stats.created;
    totalSkipped += stats.skipped;

    let langFailed = stats.failed;

    if (stats.failed.length > 0) {
      const retryDelay = Math.max(resolvedDelay * 3, DELAY_MS_OPENROUTER * 2);
      console.log(`\n🔁 Second pass for ${stats.failed.length} failed [${l}] term(s) (delay ${retryDelay}ms)…`);
      const retryStats = await generateForLang(
        stats.failed.map((f) => f.term),
        l,
        lang,
        resolveTtsProvider,
        provider,
        outDir,
        true,
        retryDelay,
        manifest,
        usageUserId,
        textToSpeechForKids,
        `Retry pass (${l})`
      );
      totalCreated += retryStats.created;
      console.log(`\n   Retry: ${retryStats.created} recovered, ${retryStats.failed.length} still failed`);
      langFailed = retryStats.failed;
    }

    allFailed.push(...langFailed);
    console.log(`\n   Created: ${stats.created}, skipped: ${stats.skipped}, failed: ${langFailed.length}`);
  }

  if (allFailed.length > 0) {
    process.exitCode = 1;
    printFailedSummary(allFailed, outDir);
  } else if (fs.existsSync(failedTermsPath(outDir))) {
    fs.unlinkSync(failedTermsPath(outDir));
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        enCount: en.length,
        arCount: ar.length,
        ttsProvider: provider || process.env.TTS_PROVIDER || 'auto',
        files: manifest,
      },
      null,
      2
    )
  );
  console.log(`\n📋 Manifest: ${manifestPath}`);
  const deployHint =
    outDir.startsWith(DOCKER_UPLOADS_OUT) || outDir.includes('/uploads/')
      ? 'Copy/sync to mujam/public/audio/kids and rebuild/deploy the frontend, or serve from uploads if configured'
      : 'Rebuild/deploy mujam frontend to serve static files from /audio/kids/';
  console.log(
    `\n✅ Done (${totalCreated} created, ${totalSkipped} skipped${allFailed.length ? `, ${allFailed.length} failed` : ''}). ${deployHint}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
