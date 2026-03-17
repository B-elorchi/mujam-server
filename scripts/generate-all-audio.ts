// Script to generate audio for all sentences in all levels
// Run with: npx ts-node scripts/generate-all-audio.ts

import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

// You'll need to get an admin JWT token first
// Login as admin and paste the token here
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!ADMIN_TOKEN) {
  console.error('❌ Please set ADMIN_TOKEN environment variable');
  console.log('   Example: $env:ADMIN_TOKEN="your_jwt_token_here"');
  console.log('   Then run: npx ts-node scripts/generate-all-audio.ts');
  process.exit(1);
}

async function generateAudioForLevel(levelId: number) {
  console.log(`\n🎵 Generating audio for Level ${levelId}...`);
  
  try {
    const response = await axios.post(
      `${API_BASE}/admin/levels/${levelId}/sentences/bulk-generate-audio`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minutes timeout (30 sentences * ~5 seconds each)
      }
    );

    console.log(`✅ Level ${levelId} complete:`, response.data.message);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Level ${levelId} failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🌱 Starting bulk audio generation for all levels...\n');
  console.log('⏳ This will take approximately 10-15 minutes for 180 sentences\n');

  const levels = [1, 2, 3, 4, 5, 6, 7];
  const results = [];

  for (const levelId of levels) {
    try {
      const result = await generateAudioForLevel(levelId);
      results.push({ levelId, success: true, ...result });
      
      // Wait 2 seconds between levels to avoid rate limiting
      if (levelId < 7) {
        console.log('⏸️  Waiting 2 seconds before next level...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      results.push({ levelId, success: false, error: String(error) });
    }
  }

  console.log('\n\n📊 Summary:');
  console.log('═══════════════════════════════════════\n');
  
  let totalSuccess = 0;
  let totalFailed = 0;

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ Level ${result.levelId}: ${result.message || 'Success'}`);
      totalSuccess++;
    } else {
      console.log(`❌ Level ${result.levelId}: Failed`);
      totalFailed++;
    }
  });

  console.log('\n═══════════════════════════════════════');
  console.log(`Total: ${totalSuccess} succeeded, ${totalFailed} failed`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All audio files generated successfully!');
  } else {
    console.log('\n⚠️  Some levels failed. Check the errors above.');
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
