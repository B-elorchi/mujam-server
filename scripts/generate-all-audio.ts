// Script to generate audio for all sentences in all levels (missing URLs only).
// Run with: ADMIN_TOKEN="jwt" npx ts-node scripts/generate-all-audio.ts
// Optional: API_BASE="https://your-host/api" LEVEL_IDS="1,2,3"

const API_BASE = (process.env.API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const LEVEL_IDS = (process.env.LEVEL_IDS || '1,2,3,4,5,6,7,8,9,10')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => !Number.isNaN(n));

if (!ADMIN_TOKEN) {
  console.error('❌ Please set ADMIN_TOKEN environment variable');
  console.log('   Example: ADMIN_TOKEN="your_jwt" npx ts-node scripts/generate-all-audio.ts');
  process.exit(1);
}

async function postBulkForLevel(levelId: number) {
  const url = `${API_BASE}/admin/levels/${levelId}/sentences/bulk-generate-audio`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 300_000);
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
    if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 400)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(id);
  }
}

async function main() {
  console.log('🌱 Bulk sentence audio (missing only)…\n');
  const results: { levelId: number; success: boolean; error?: string }[] = [];

  for (const levelId of LEVEL_IDS) {
    try {
      console.log(`\n🎵 Level ${levelId}…`);
      const data = await postBulkForLevel(levelId);
      console.log('   ✅', data.message || JSON.stringify(data).slice(0, 300));
      results.push({ levelId, success: true });
      if (LEVEL_IDS.indexOf(levelId) < LEVEL_IDS.length - 1) {
        console.log('⏸️  Waiting 2 seconds…');
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Level ${levelId}:`, msg);
      results.push({ levelId, success: false, error: msg });
    }
  }

  console.log('\n📊 Summary:');
  const ok = results.filter((r) => r.success).length;
  const bad = results.filter((r) => !r.success).length;
  console.log(`Succeeded: ${ok}, Failed: ${bad}`);
  if (bad) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
