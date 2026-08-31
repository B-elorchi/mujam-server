/**
 * Moajam Kids — bulk TTS audio generation (optional; on-demand TTS works without this).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION 1 — On-demand (recommended for moajam-dev)
 * ═══════════════════════════════════════════════════════════════════════════════
 * No pre-generation needed. Set in mujam-server/.env (or Docker .env):
 *
 *   DEEPGRAM_API_KEY=your_key
 *   AI_TTS_VOICE_EN=aura-asteria-en   # optional, default aura-asteria-en
 *   AI_TTS_VOICE_AR=aura-hera-ar      # optional, default aura-hera-ar
 *
 * When a child taps Listen, the frontend calls:
 *   GET /api/kids/audio?text=<word>&lang=en
 * Deepgram generates MP3 on first request; the server caches up to 500 clips in
 * memory and sends Cache-Control: max-age=86400. Browser speech is fallback if
 * TTS fails.
 *
 * Alphabet letters use phonetic names (A → "ay", B → "bee", …) — see
 * mujam/src/kids/audio.ts LETTER_PHONETICS (same map in scripts/kids-audio-terms.ts).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION 2 — Bulk pre-generate static MP3s (offline / CDN / faster first play)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   cd mujam-server
 *   npm run kids:generate-audio              # English (~130 terms)
 *   npm run kids:generate-audio -- --lang ar   # Arabic
 *   npm run kids:generate-audio -- --lang all  # both (default)
 *   npm run kids:generate-audio -- --dry-run # list terms only
 *   npm run kids:generate-audio -- --force   # overwrite existing files
 *
 * Output:
 *   ../mujam/public/audio/kids/en/<slug>.mp3
 *   ../mujam/public/audio/kids/ar/<slug>.mp3
 *   ../mujam/public/audio/kids/manifest.json
 *
 * The frontend (mujam/src/kids/audio.ts) checks static files first, then falls
 * back to the on-demand API. Rebuild/redeploy the mujam frontend after generating.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Cost / limits (Deepgram Aura TTS)
 * ═══════════════════════════════════════════════════════════════════════════════
 * ~$0.015 per 1,000 characters. Full kids catalog ≈ 130 EN + 130 AR terms,
 * ~8 chars average → ~2,000 chars per language → ~$0.03 per language total.
 * Free tier includes credits; watch usage in the Deepgram console.
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
  --lang <en|ar|all>   Language(s) to generate (default: all)
  --out <dir>          Output root (default: mujam/public/audio/kids)
  --force              Overwrite existing MP3 files
  --dry-run            Print terms only, no API calls
  --delay <ms>         Pause between Deepgram calls (default: 250)
  --help               Show this help

Environment:
  DEEPGRAM_API_KEY     Required for generation
  AI_TTS_VOICE_EN      Optional English voice (default aura-asteria-en)
  AI_TTS_VOICE_AR      Optional Arabic voice (default aura-hera-ar)

On-demand alternative: set DEEPGRAM_API_KEY and skip this script entirely.
`);
}

function parseArgs(argv: string[]) {
  let lang: LangMode = 'all';
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

  return { lang, outDir, force, dryRun, delayMs };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateForLang(
  terms: string[],
  lang: 'en' | 'ar',
  outDir: string,
  force: boolean,
  delayMs: number,
  manifest: Record<string, string>,
  textToSpeech: (text: string, speed: 'normal' | 'slow', userId?: string, language?: 'en' | 'ar') => Promise<Buffer>
) {
  const langDir = path.join(outDir, lang);
  fs.mkdirSync(langDir, { recursive: true });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const term of terms) {
    const slug = audioSlug(term, lang);
    const filePath = path.join(langDir, `${slug}.mp3`);
    manifest[`${lang}:${term}`] = `/${lang}/${slug}.mp3`;

    if (!force && fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  🎵 [${lang}] "${term}" → ${slug}.mp3 … `);
      const buffer = await textToSpeech(term, 'normal', undefined, lang);
      fs.writeFileSync(filePath, buffer);
      created++;
      console.log('✓');
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${msg}`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  return { created, skipped, failed };
}

async function main() {
  const { lang, outDir, force, dryRun, delayMs } = parseArgs(process.argv.slice(2));
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

  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('❌ DEEPGRAM_API_KEY is not set. Add it to mujam-server/.env');
    console.log('   Or use on-demand TTS only — no script required.');
    process.exit(1);
  }

  const { textToSpeech } = await import('../src/services/ai/tts.service');

  fs.mkdirSync(outDir, { recursive: true });
  const manifest: Record<string, string> = {};
  const langs: ('en' | 'ar')[] = lang === 'all' ? ['en', 'ar'] : [lang];

  for (const l of langs) {
    const terms = l === 'en' ? en : ar;
    console.log(`\n📁 ${l.toUpperCase()} → ${path.join(outDir, l)} (${terms.length} terms)\n`);
    const stats = await generateForLang(terms, l, outDir, force, delayMs, manifest, textToSpeech);
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
