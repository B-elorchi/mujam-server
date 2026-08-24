import prisma from '../../config/database'

export type AIServiceName = 'gpt' | 'deepgram' | 'deepgram-tts' | string

const GPT_PRICING: Record<string, { input: number; output: number }> = {
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'meta-llama/llama-3.1-8b-instruct': { input: 0.06, output: 0.06 },
}

/** Deepgram Nova STT — ~$0.0043 / minute */
export function estimateSttCostUsd(durationSeconds: number): number {
  return (durationSeconds / 60) * 0.0043
}

/** Deepgram Aura TTS — $0.015 / 1k characters */
export function estimateTtsCostUsd(characters: number): number {
  return (characters / 1_000) * 0.015
}

export function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4)
}

export function estimateGptCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const price = GPT_PRICING[model] || { input: 0.15, output: 0.6 }
  return (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output
}

export async function logAIUsage(params: {
  userId: string
  service: AIServiceName
  tokens?: number
  characters?: number
  durationMin?: number
  costUsd: number
}): Promise<void> {
  if (!params.userId || params.costUsd < 0) return
  try {
    await prisma.aIUsageLog.create({
      data: {
        userId: params.userId,
        service: params.service,
        tokens: params.tokens,
        characters: params.characters,
        durationMin: params.durationMin,
        costUsd: params.costUsd,
      },
    })
  } catch (error) {
    console.error('Failed to log AI usage:', error)
  }
}

export async function logGptUsage(
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<void> {
  await logAIUsage({
    userId,
    service: 'gpt',
    tokens: promptTokens + completionTokens,
    costUsd: estimateGptCostUsd(model, promptTokens, completionTokens),
  })
}

export async function logDeepgramSttUsage(userId: string, durationSeconds: number): Promise<void> {
  await logAIUsage({
    userId,
    service: 'deepgram',
    durationMin: durationSeconds / 60,
    costUsd: estimateSttCostUsd(durationSeconds),
  })
}

export async function logDeepgramTtsUsage(userId: string, text: string): Promise<void> {
  const characters = text.length
  await logAIUsage({
    userId,
    service: 'deepgram-tts',
    characters,
    costUsd: estimateTtsCostUsd(characters),
  })
}

export function serviceDisplayLabel(service: string): string {
  switch (service) {
    case 'deepgram':
      return 'Deepgram STT'
    case 'deepgram-tts':
      return 'Deepgram TTS'
    case 'gpt':
      return 'GPT / OpenRouter'
    default:
      return service
  }
}

export function serviceTypeLabel(service: string): string {
  switch (service) {
    case 'deepgram':
      return 'stt'
    case 'deepgram-tts':
      return 'tts'
    case 'gpt':
      return 'chat'
    default:
      return service
  }
}
