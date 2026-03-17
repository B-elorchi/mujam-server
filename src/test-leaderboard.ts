import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLeaderboard() {
    console.log('🧪 Testing Leaderboard Filtering...');

    // 1. Create a test user
    const user = await prisma.user.findFirst({
        where: { email: 'elorchi@mujam.ai' }
    });

    if (!user) {
        console.error('❌ Admin user not found. Please run seed first.');
        return;
    }

    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);

    console.log('📅 Now:', now.toISOString());
    console.log('📅 Last Month:', lastMonth.toISOString());

    // 2. Add progress records
    console.log('📝 Adding progress records...');

    // Sentence this week
    await prisma.userSentenceProgress.create({
        data: {
            userId: user.id,
            sentenceId: (await prisma.sentence.findFirst())?.id || '',
            completed: true,
            completedAt: now
        }
    }).catch(() => { });

    // Game last month
    await prisma.userGameProgress.create({
        data: {
            userId: user.id,
            gameId: (await prisma.game.findFirst())?.id || '',
            completed: true,
            completedAt: lastMonth
        }
    }).catch(() => { });

    console.log('✅ Mock data created.');
}

testLeaderboard()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
