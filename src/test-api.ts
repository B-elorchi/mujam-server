import { PrismaClient } from '@prisma/client';
import { generateAccessToken } from './utils/jwt';
import axios from 'axios';

const prisma = new PrismaClient();

async function runTest() {
    const user = await prisma.user.findFirst({ where: { email: 'elorchi@mujam.ai' } });
    if (!user) {
        console.error('User not found');
        return;
    }

    const token = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const baseUrl = 'http://localhost:4000/api/leaderboard';

    try {
        const weeklyRes = await axios.get(`${baseUrl}?period=weekly`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('--- WEEKLY ---');
        console.log(JSON.stringify(weeklyRes.data.data.leaderboard, null, 2));

        const allTimeRes = await axios.get(`${baseUrl}?period=all-time`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('--- ALL-TIME ---');
        console.log(JSON.stringify(allTimeRes.data.data.leaderboard, null, 2));
    } catch (err: any) {
        console.error('API Error:', err.response?.data || err.message);
    }
}

runTest().finally(() => prisma.$disconnect());
