import prisma from '../../config/database'

export interface DifficultyMetrics {
    pronunciationAvg: number
    grammarErrorRate: number
    sessionCount: number
    recommendedAction: 'keep' | 'increase' | 'decrease'
    reason: string
}

export async function evaluateDifficulty(userId: string): Promise<DifficultyMetrics> {
    const recentSessions = await prisma.aISession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 5,
    })

    if (recentSessions.length < 3) {
        return {
            pronunciationAvg: 0,
            grammarErrorRate: 0,
            sessionCount: recentSessions.length,
            recommendedAction: 'keep',
            reason: 'Need at least 3 sessions to evaluate.',
        }
    }

    // Calculate averages
    let totalPronunciation = 0
    let totalMistakes = 0
    let totalMessages = 0

    recentSessions.forEach((session) => {
        const summary = session.errorSummary as any
        if (summary?.overallScore) totalPronunciation += summary.overallScore

        const messages = session.messages as any[]
        totalMessages += messages.filter(m => m.role === 'user').length
        if (summary?.topMistakes) {
            totalMistakes += summary.topMistakes.reduce((acc: number, m: any) => acc + (m.count || 0), 0)
        }
    })

    const pronunciationAvg = totalPronunciation / recentSessions.length
    const grammarErrorRate = totalMessages > 0 ? totalMistakes / totalMessages : 0

    let recommendedAction: 'keep' | 'increase' | 'decrease' = 'keep'
    let reason = 'Performing at the current level.'

    if (pronunciationAvg > 85 && grammarErrorRate < 0.2) {
        recommendedAction = 'increase'
        reason = 'Great performance! You might find the next level more challenging.'
    } else if (pronunciationAvg < 50 || grammarErrorRate > 1.0) {
        recommendedAction = 'decrease'
        reason = 'The current level seems a bit difficult. Moving down might help build a stronger foundation.'
    }

    return {
        pronunciationAvg,
        grammarErrorRate,
        sessionCount: recentSessions.length,
        recommendedAction,
        reason,
    }
}
