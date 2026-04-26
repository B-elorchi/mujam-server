// Script to generate audio + word timing for all shadowing stories (missing audio only).
// Run with: ADMIN_TOKEN="jwt" npx ts-node scripts/generate-all-story-audio.ts

const API_BASE = (process.env.API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!ADMIN_TOKEN) {
  console.error('❌ Please set ADMIN_TOKEN environment variable');
  console.log('   Example: ADMIN_TOKEN="your_jwt" npx ts-node scripts/generate-all-story-audio.ts');
  process.exit(1);
}

async function generateStoryAudio() {
  console.log('\n🎙️ Generating audio + word timing for all shadowing stories...');

  const url = `${API_BASE}/admin/stories/bulk-generate-audio`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 600_000);
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
    if (!res.ok) {
      throw new Error(`${res.status}: ${text.slice(0, 500)}`);
    }
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(id);
  }
}

async function main() {
  console.log('🌱 Starting story audio generation...\n');
  console.log('⏳ This generates TTS audio + Deepgram word timing per story\n');

  const result = await generateStoryAudio();

  console.log('\n📊 Summary:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Generated: ${result.data?.generated ?? 0}`);
  console.log(`❌ Failed:    ${result.data?.failed ?? 0}`);
  console.log(`📦 Total:     ${result.data?.total ?? 0}`);
  console.log('═══════════════════════════════════════');

  if ((result.data?.failed ?? 0) === 0) {
    console.log('\n🎉 All story audio files generated successfully!');
  } else {
    console.log('\n⚠️  Some stories failed. Re-run the script to retry failed ones.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
