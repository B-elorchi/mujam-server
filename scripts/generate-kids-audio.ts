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
 *   npm run kids:generate-audio                              # EN (Deepgram) + AR (OpenRouter)
 *   npm run kids:generate-audio -- --lang ar --provider openrouter --force
 *   npm run kids:generate-audio -- --lang en --force   # re-generate EN MP3s after speed change
 *   npm run kids:generate-audio -- --dry-run                 # list terms only
 *
 * Output:
 *   ../mujam/public/audio/kids/en/<slug>.mp3   (Deepgram)
 *   ../mujam/public/audio/kids/ar/<slug>.wav   (OpenRouter Gemini — PCM wrapped as WAV)
 *   ../mujam/public/audio/kids/manifest.json
 *
 * The frontend (mujam/src/kids/audio.ts) checks static .mp3/.wav first, then falls
 * back to the on-demand API. Rebuild/redeploy the mujam frontend after generating.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Cost / limits
 * ═══════════════════════════════════════════════════════════════════════════════
 * Deepgram Aura: ~$0.015 / 1k chars (English).
 * OpenRouter Gemini 3.1 Flash TTS: ~$1 / 1M input chars + audio output tokens.
 * Script waits 250ms between requests to reduce rate-limit risk.
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
import {
  resolveTtsProvider,
  type TtsProviderMode,
} from '../src/services/ai/tts.service';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DEFAULT_OUT = path.resolve(__dirname, '../../mujam/public/audio/kids');
const DELAY_MS = 250;

type LangMode = 'en' | 'ar' | 'all';

function printHelp() {
  console.log(`
Moajam Kids audio generator

Usage:
  npm run kids:generate-audio [-- options]

Options:
  --lang <en|ar|all>       Language(s) to generate (default: all)
  --provider <mode>        TTS backend: deepgram | openrouter | auto (default: auto)
  --out <dir>              Output root (default: mujam/public/audio/kids)
  --force                  Overwrite existing audio files
  --dry-run                Print terms only, no API calls
  --delay <ms>             Pause between API calls (default: 250)
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

Provider selection (auto):
  en → Deepgram Aura (MP3)
  ar → OpenRouter Gemini (WAV — Gemini returns PCM only)

On-demand alternative: set API keys and skip this script entirely.
`);
}

function parseArgs(argv: string[]) {
  let lang: LangMode = 'all';
  let provider: TtsProviderMode | undefined;
  let outDir = process.env.KIDS_AUDIO_OUT || DEFAULT_OUT;
  let force = false;
  let dryRun = false;
  let delayMs = DELAY_MS;

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
    } else if (arg === '--delay' && argv[i + 1]) {
      delayMs = parseInt(argv[++i], 10) || DELAY_MS;
    }
  }

  return { lang, provider, outDir, force, dryRun, delayMs };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateForLang(
  terms: string[],
  lang: 'en' | 'ar',
  providerOverride: TtsProviderMode | undefined,
  outDir: string,
  force: boolean,
  delayMs: number,
  manifest: Record<string, string>,
  textToSpeechForKids: (
    text: string,
    lang: 'en' | 'ar',
    userId?: string,
    options?: { provider?: TtsProviderMode }
  ) => Promise<{ buffer: Buffer; extension: 'mp3' | 'wav'; provider: string }>
) {
  const provider = resolveTtsProvider(lang, providerOverride);
  const langDir = path.join(outDir, lang);
  fs.mkdirSync(langDir, { recursive: true });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`   Provider: ${provider} (${lang === 'ar' ? 'OpenRouter Gemini → WAV' : 'Deepgram → MP3'})`);

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
      const result = await textToSpeechForKids(term, lang, undefined, { provider });
      fs.writeFileSync(filePath, result.buffer);
      created++;
      console.log('✓');
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      const hint = /No such model|invalid.*voice/i.test(msg)
        ? ' — check AI_TTS_VOICE_EN or OPENROUTER_TTS_MODEL'
        : '';
      console.log(`✗ ${msg}${hint}`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  return { created, skipped, failed };
}

function validateEnvForLangs(langs: ('en' | 'ar')[], providerOverride?: TtsProviderMode) {
  const needsDeepgram = langs.some((l) => resolveTtsProvider(l, providerOverride) === 'deepgram');
  const needsOpenRouter = langs.some((l) => resolveTtsProvider(l, providerOverride) === 'openrouter');

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
  const { lang, provider, outDir, force, dryRun, delayMs } = parseArgs(process.argv.slice(2));
  const { en, ar } = collectKidsAudioTerms();

  console.log(`\n🧒 Moajam Kids audio — ${en.length} EN terms, ${ar.length} AR terms\n`);

  if (dryRun) {
    console.log('English:');
    en.forEach((t) => console.log(`  • ${t}`));
    console.log('\nArabic:');
    ar.forEach((t) => console.log(`  • ${t}`));
    console.log('\n(dry-run — no files written)');
    return;
  }

  const langs: ('en' | 'ar')[] = lang === 'all' ? ['en', 'ar'] : [lang];
  validateEnvForLangs(langs, provider);

  const { textToSpeechForKids, assertAuraEnglishVoice, getKidsEnglishTtsSpeed } = await import(
    '../src/services/ai/tts.service'
  );

  if (langs.includes('en')) {
    const enSpeed = getKidsEnglishTtsSpeed();
    console.log(`   Kids EN TTS speed: ${enSpeed} (Deepgram Aura-2 min 0.7)`);
  }

  if (langs.includes('en') && resolveTtsProvider('en', provider) === 'deepgram') {
    const enVoice = process.env.AI_TTS_VOICE_EN || 'aura-asteria-en';
    try {
      assertAuraEnglishVoice(enVoice);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ ${msg}`);
      process.exit(1);
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const manifest: Record<string, string> = {};

  for (const l of langs) {
    const terms = l === 'en' ? en : ar;
    console.log(`\n📁 ${l.toUpperCase()} → ${path.join(outDir, l)} (${terms.length} terms)\n`);
    const stats = await generateForLang(
      terms,
      l,
      provider,
      outDir,
      force,
      delayMs,
      manifest,
      textToSpeechForKids
    );
    console.log(`\n   Created: ${stats.created}, skipped: ${stats.skipped}, failed: ${stats.failed}`);
    if (stats.failed > 0) process.exitCode = 1;
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
  console.log('✅ Done. Rebuild/deploy mujam frontend to serve static files from /audio/kids/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
