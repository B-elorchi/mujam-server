/**
 * Collect speakable vocabulary from Moajam Kids seed data.
 * Keep LETTER_PHONETICS in sync with mujam/src/kids/audio.ts
 */
import {
  KIDS_MODULE_SEEDS,
  type FlashcardItem,
  type LessonScreen,
} from '../prisma/seed-kids-courses';

/** TTS-friendly names for single English letters (A–Z). */
export const LETTER_PHONETICS: Record<string, string> = {
  A: 'ay',
  B: 'bee',
  C: 'see',
  D: 'dee',
  E: 'ee',
  F: 'eff',
  G: 'jee',
  H: 'aitch',
  I: 'eye',
  J: 'jay',
  K: 'kay',
  L: 'ell',
  M: 'em',
  N: 'en',
  O: 'oh',
  P: 'pee',
  Q: 'cue',
  R: 'are',
  S: 'ess',
  T: 'tee',
  U: 'you',
  V: 'vee',
  W: 'double you',
  X: 'ex',
  Y: 'why',
  Z: 'zee',
};

/** Match frontend toSpeakableText() for English taps. */
export function toSpeakableEn(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z]$/.test(trimmed)) {
    return LETTER_PHONETICS[trimmed.toUpperCase()] ?? trimmed;
  }

  const alpha = trimmed.replace(/[^\p{L}\p{N}\s'-]/gu, '').trim();
  if (/^[A-Za-z]$/.test(alpha)) {
    return LETTER_PHONETICS[alpha.toUpperCase()] ?? alpha;
  }
  if (alpha.length > 0) return alpha;

  return null;
}

/** Arabic labels are sent as-is when present. */
export function toSpeakableAr(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const arabic = trimmed.replace(/[^\p{Script=Arabic}\s'-]/gu, '').trim();
  return arabic.length > 0 ? arabic : null;
}

/** Filesystem-safe slug; Arabic uses base64url prefix. */
export function audioSlug(text: string, lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    return Buffer.from(text, 'utf8').toString('base64url').slice(0, 40);
  }
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'term';
}

function addFlashcardItems(items: FlashcardItem[], en: Set<string>, ar: Set<string>) {
  for (const item of items) {
    const speakEn = toSpeakableEn(item.en);
    if (speakEn) en.add(speakEn);
    const speakAr = toSpeakableAr(item.ar);
    if (speakAr) ar.add(speakAr);
  }
}

function addLabel(label: string, en: Set<string>, ar: Set<string>) {
  const speakEn = toSpeakableEn(label);
  if (speakEn) en.add(speakEn);
  const speakAr = toSpeakableAr(label);
  if (speakAr) ar.add(speakAr);
}

function walkScreen(screen: LessonScreen, en: Set<string>, ar: Set<string>) {
  switch (screen.type) {
    case 'flashcard':
    case 'listen':
    case 'grid':
    case 'matching':
    case 'sort':
    case 'speak':
      addFlashcardItems(screen.items, en, ar);
      break;
    case 'choice':
      for (const q of screen.questions) {
        if (q.icon) addLabel(q.icon, en, ar);
        for (const opt of q.options) addLabel(opt.label, en, ar);
      }
      break;
    case 'complete':
      break;
    default:
      break;
  }
}

export function collectKidsAudioTerms(): { en: string[]; ar: string[] } {
  const en = new Set<string>();
  const ar = new Set<string>();

  for (const mod of KIDS_MODULE_SEEDS) {
    for (const screen of mod.screens) {
      walkScreen(screen, en, ar);
    }
  }

  return {
    en: [...en].sort((a, b) => a.localeCompare(b)),
    ar: [...ar].sort((a, b) => a.localeCompare(b, 'ar')),
  };
}
