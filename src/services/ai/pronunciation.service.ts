export interface PronunciationResult {
    overallScore: number
    wordScores: WordScore[]
    feedback: string
    correctWords: number
    totalWords: number
}

export interface WordScore {
    word: string
    score: number
    status: 'correct' | 'close' | 'incorrect'
}

/**
 * Compare original story text with STT transcript.
 * Strips punctuation (STT often adds commas/periods) and uses fuzzy LCS
 * so insertions/deletions don't zero-out every following word.
 */
export function scorePronunciation(
    originalText: string,
    userTranscript: string
): PronunciationResult {
    const originalWords = tokenize(originalText)
    const userWords = tokenize(userTranscript)
    const totalWords = originalWords.length

    if (totalWords === 0) {
        return {
            overallScore: 0,
            wordScores: [],
            feedback: generateFeedback(0),
            correctWords: 0,
            totalWords: 0,
        }
    }

    const MATCH = 0.72
    const m = originalWords.length
    const n = userWords.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (calculateSimilarity(originalWords[i - 1], userWords[j - 1]) >= MATCH) {
                dp[i][j] = dp[i - 1][j - 1] + 1
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
            }
        }
    }

    const pairedUserIndex = new Array<number>(m).fill(-1)
    let i = m
    let j = n
    while (i > 0 && j > 0) {
        const sim = calculateSimilarity(originalWords[i - 1], userWords[j - 1])
        if (sim >= MATCH && dp[i][j] === dp[i - 1][j - 1] + 1) {
            pairedUserIndex[i - 1] = j - 1
            i -= 1
            j -= 1
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i -= 1
        } else {
            j -= 1
        }
    }

    const usedUser = new Set(pairedUserIndex.filter((idx) => idx >= 0))

    const wordScores: WordScore[] = originalWords.map((word, idx) => {
        const paired = pairedUserIndex[idx]
        if (paired >= 0) {
            const score = Math.round(calculateSimilarity(word, userWords[paired]) * 100)
            return {
                word,
                score,
                status: score >= 85 ? 'correct' : score >= 60 ? 'close' : 'incorrect',
            }
        }

        let best = 0
        const windowStart = Math.max(0, idx - 2)
        const windowEnd = Math.min(userWords.length - 1, idx + 2)
        for (let u = windowStart; u <= windowEnd; u++) {
            if (usedUser.has(u)) continue
            best = Math.max(best, calculateSimilarity(word, userWords[u]))
        }

        const score = Math.round(best * 100)
        return {
            word,
            score,
            status: score >= 85 ? 'correct' : score >= 60 ? 'close' : 'incorrect',
        }
    })

    const overallScore = Math.round(
        wordScores.reduce((sum, w) => sum + w.score, 0) / wordScores.length
    )
    const correctWords = wordScores.filter((w) => w.status === 'correct' || w.status === 'close').length

    return {
        overallScore,
        wordScores,
        feedback: generateFeedback(overallScore),
        correctWords,
        totalWords,
    }
}

export function tokenize(text: string): string[] {
    return normalizeText(text).split(' ').filter(Boolean)
}

function calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1
    if (!a || !b) return 0
    const distance = levenshteinDistance(a, b)
    const maxLen = Math.max(a.length, b.length)
    return 1 - distance / maxLen
}

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) =>
        Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    )
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1]
                ? matrix[i - 1][j - 1]
                : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
    }
    return matrix[b.length][a.length]
}

function generateFeedback(score: number): string {
    if (score >= 90) return 'ممتاز! نطقك رائع جداً 🌟'
    if (score >= 75) return 'جيد جداً! استمر في التدريب 👍'
    if (score >= 60) return 'جيد، لكن بعض الكلمات تحتاج مزيداً من التدريب'
    if (score >= 40) return 'تحتاج تدريباً أكثر على النطق، استمع جيداً للصوت الأصلي'
    return 'لا تيأس! اسمع الجملة مرات عدة ثم حاول مجدداً 💪'
}
