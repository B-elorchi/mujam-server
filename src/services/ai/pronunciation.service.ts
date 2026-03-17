export interface PronunciationResult {
    overallScore: number        // 0-100
    wordScores: WordScore[]
    feedback: string            // Arabic feedback message
}

export interface WordScore {
    word: string
    score: number               // 0-100
    status: 'correct' | 'close' | 'incorrect'
}

export function scorePronunciation(
    originalText: string,
    userTranscript: string
): PronunciationResult {
    const originalWords = normalizeText(originalText).split(' ').filter(Boolean)
    const userWords = normalizeText(userTranscript).split(' ').filter(Boolean)

    const wordScores: WordScore[] = originalWords.map((originalWord, i) => {
        // Try to find the word in userWords (handling small misalignments)
        const userWord = findClosestWord(originalWord, userWords, i)
        const similarity = calculateSimilarity(originalWord, userWord)
        const score = Math.round(similarity * 100)

        return {
            word: originalWord,
            score,
            status: score >= 85 ? 'correct' : score >= 60 ? 'close' : 'incorrect',
        }
    })

    const overallScore = wordScores.length > 0
        ? Math.round(wordScores.reduce((sum, w) => sum + w.score, 0) / wordScores.length)
        : 0

    return {
        overallScore,
        wordScores,
        feedback: generateFeedback(overallScore),
    }
}

function findClosestWord(originalWord: string, userWords: string[], index: number): string {
    // Simple heuristic: check current, previous, and next index
    const candidates = [
        userWords[index],
        userWords[index - 1],
        userWords[index + 1]
    ].filter(Boolean)

    if (candidates.length === 0) return ''

    let bestMatch = candidates[0]
    let maxSimilarity = -1

    for (const candidate of candidates) {
        const sim = calculateSimilarity(originalWord, candidate)
        if (sim > maxSimilarity) {
            maxSimilarity = sim
            bestMatch = candidate
        }
    }

    return maxSimilarity > 0.4 ? bestMatch : ''
}

function calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1
    if (!a || !b) return 0
    const distance = levenshteinDistance(a, b)
    const maxLen = Math.max(a.length, b.length)
    return 1 - distance / maxLen
}

function normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^a-z\s]/g, '').trim()
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
