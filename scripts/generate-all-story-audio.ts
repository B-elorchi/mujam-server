// Script to generate audio + word timing for all shadowing stories
// Run with: npx ts-node scripts/generate-all-story-audio.ts

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!ADMIN_TOKEN) {
  console.error('❌ Please set ADMIN_TOKEN environment variable');
  console.log('   Example: ADMIN_TOKEN="your_jwt_token_here" npx ts-node scripts/generate-all-story-audio.ts');
  process.exit(1);
}

async function generateStoryAudio() {
  console.log('\n🎙️ Generating audio + word timing for all shadowing stories...');

  try {
    const response = await axios.post(
      `${API_BASE}/admin/stories/bulk-generate-audio`,
      {},
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 600000, // 10 minutes (each story needs TTS + STT calls)
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('❌ Story audio generation failed:', error.response?.data || error.message);
    throw error;
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
