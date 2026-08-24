import prisma from '../../config/database'
import { openrouter } from '../../config/openrouter'
import { ChatMessage } from './chat.service'
import { estimateTokens, logGptUsage } from './usage.service'

export interface SessionAnalysis {
    topMistakes: Array<{ category: string; count: number; example: string }>
    improvementAreas: string[]
    strengths: string[]
    nextFocusAreas: string[]
    overallScore: number
    summaryAr: string
}

export async function parseAIResponse(rawText: string) {
    const corrections: Array<{ wrong: string; right: string }> = []
    const vocab: Array<{ word: string; simpler: string }> = []

    // Extract [CORRECTION: wrong → right]
    let cleanText = rawText.replace(
        /\[CORRECTION:\s*(.+?)\s*→\s*(.+?)\]/g,
        (_, wrong, right) => {
            corrections.push({ wrong: wrong.trim(), right: right.trim() })
            return right.trim()
        }
    )

    // Extract [VOCAB: simpler_word]
    cleanText = cleanText.replace(
        /\[VOCAB:\s*(.+?)\]/g,
        (_, simpler) => {
            vocab.push({ word: simpler, simpler })
            return simpler
        }
    )

    return { cleanText: cleanText.trim(), corrections, vocab }
}

export async function analyzeSession(
    sessionId: string,
    userId: string
): Promise<SessionAnalysis> {
    const session = await prisma.aISession.findUnique({ where: { id: sessionId } })
    if (!session) throw new Error('Session not found')

    const messages = (session.messages as unknown) as ChatMessage[]
    const allCorrections: any[] = []

    for (const msg of messages) {
        if (msg.role === 'assistant') {
            const { corrections } = await parseAIResponse(msg.content)
            allCorrections.push(...corrections)
        }
    }

    const summaryPrompt = `
    You are analyzing an English learning conversation.
    Student level: ${session.userLevel}/7
    Mistakes made: ${allCorrections.map(c => `"${c.wrong}" -> "${c.right}"`).join(', ')}

    Generate a JSON summary:
    {
      "topMistakes": [{ "category": "grammar|vocab|tense", "count": 1, "example": "..." }],
      "improvementAreas": ["..."],
      "strengths": ["..."],
      "nextFocusAreas": ["..."],
      "overallScore": 80,
      "summaryAr": "ملخص للمتعلم باللغة العربية"
    }
    Response must be JSON only.
  `

    const response = await openrouter.chat.completions.create({
        model: process.env.OPENROUTER_DEFAULT_MODEL!,
        messages: [{ role: 'user', content: summaryPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
    })

    const model = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini'
    const promptTokens = response.usage?.prompt_tokens || estimateTokens(summaryPrompt)
    const completionTokens =
      response.usage?.completion_tokens || estimateTokens(response.choices[0].message.content || '')
    await logGptUsage(userId, model, promptTokens, completionTokens)

    const summary = JSON.parse(response.choices[0].message.content || '{}') as SessionAnalysis

    await prisma.aISession.update({
        where: { id: sessionId },
        data: { errorSummary: summary as any, endedAt: new Date() }
    })

    return summary
}
