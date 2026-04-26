/**
 * Generate missing shadowing story audio + word timing, then missing sentence audios per level.
 * Server must be running (same machine or reachable URL).
 *
 * Usage (from mujam-server):
 *   ADMIN_TOKEN="your_admin_jwt" npm run media:all
 *   API_BASE="https://api.yourdomain.com/api" ADMIN_TOKEN="..." npm run media:all
 *
 * Optional:
 *   LEVEL_IDS="1,2,3,4,5,6,7,8,9,10"   (default: 1–10)
 */

const API_BASE = (process.env.API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const LEVEL_IDS = (process.env.LEVEL_IDS || '1,2,3,4,5,6,7,8,9,10')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => !Number.isNaN(n));

async function postJson(path: string, timeoutMs: number) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${p}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
    }
    return data as Record<string, unknown>;
  } finally {
    clearTimeout(id);
  }
}

async function main() {
  if (!ADMIN_TOKEN) {
    console.error('❌ Set ADMIN_TOKEN (admin JWT).');
    console.error('   Example: ADMIN_TOKEN="eyJ..." npm run media:all');
    process.exit(1);
  }

  console.log(`API_BASE: ${API_BASE}\n`);

  console.log('📖 Shadowing stories (only rows with missing audio on server)…');
  try {
    const storyRes = await postJson('/admin/stories/bulk-generate-audio', 600_000);
    console.log('   →', JSON.stringify(storyRes, null, 2).slice(0, 2000));
  } catch (e: any) {
    console.error('   Stories bulk failed:', e.message);
    process.exit(1);
  }

  console.log('\n📝 Sentences per level (missing normal/slow only)…');
  for (const levelId of LEVEL_IDS) {
    try {
      const r = await postJson(`/admin/levels/${levelId}/sentences/bulk-generate-audio`, 300_000);
      console.log(`   Level ${levelId}:`, JSON.stringify(r).slice(0, 500));
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e: any) {
      console.error(`   Level ${levelId} failed:`, e.message);
    }
  }

  console.log('\n✅ Done. Re-run anytime; endpoints skip rows that already have audio.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
