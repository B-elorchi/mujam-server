import { openrouter } from '../../config/openrouter'
import { AISettings } from '@prisma/client'
import prisma from '../../config/database'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface StreamChatOptions {
    userId: string
    messages: ChatMessage[]
    settings: AISettings
    onToken?: (token: string) => void
    onComplete?: (fullText: string) => void
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
    const { messages, settings, onToken, onComplete } = options

    try {
        const stream = await openrouter.chat.completions.create({
            model: settings.gptModel || process.env.OPENROUTER_DEFAULT_MODEL!,
            messages,
            max_tokens: parseInt(process.env.AI_MAX_TOKENS || '500'),
            temperature: settings.temperature || 0.7,
            stream: true,
        })

        let fullText = ''
        let promptTokens = estimateTokens(messages.map(m => m.content).join(' '))

        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || ''
            if (token) {
                fullText += token
                if (onToken) onToken(token)
            }
        }

        const completionTokens = estimateTokens(fullText)
        await logGPTCost(options.userId, settings.gptModel, promptTokens, completionTokens)

        if (onComplete) onComplete(fullText)
    } catch (error: any) {
        if (error.status === 429 || error.status === 503) {
            console.warn('Primary model failed, switching to fallback')
            await streamChat({
                ...options,
                settings: {
                    ...settings,
                    gptModel: process.env.OPENROUTER_FALLBACK_MODEL!
                }
            })
        } else {
            throw error
        }
    }
}

async function logGPTCost(userId: string, model: string, promptTokens: number, completionTokens: number) {
    const pricing: Record<string, { input: number; output: number }> = {
        'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
        'openai/gpt-4o': { input: 2.50, output: 10.00 },
        'meta-llama/llama-3.1-8b-instruct': { input: 0.06, output: 0.06 },
    }
    const price = pricing[model] || { input: 0.15, output: 0.60 }
    const costUsd = (promptTokens / 1_000_000 * price.input) + (completionTokens / 1_000_000 * price.output)

    await prisma.aIUsageLog.create({
        data: {
            userId,
            service: 'gpt',
            tokens: promptTokens + completionTokens,
            costUsd,
        },
    })
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
}
