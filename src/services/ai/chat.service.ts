import { openrouter } from '../../config/openrouter'
import { AISettings } from '@prisma/client'
import { estimateTokens, logGptUsage } from './usage.service'

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
        await logGptUsage(options.userId, settings.gptModel, promptTokens, completionTokens)

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
