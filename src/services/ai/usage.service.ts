import prisma from '../../config/database'

export type AIServiceName = 'gpt' | 'deepgram' | 'deepgram-tts' | 'openrouter-tts' | string

export type AIProvider = 'openrouter' | 'deepgram' | 'openai'

/** On-demand kids lesson TTS (GET /api/kids/audio) */
export const KIDS_TTS_FEATURE = 'kids_tts'
/** Bulk kids audio script (generate-kids-audio.ts) */
export const KIDS_TTS_BULK_FEATURE = 'kids_tts_bulk'
export const CHAT_FEATURE = 'chat'
export const STT_FEATURE = 'stt'
export const TTS_FEATURE = 'tts'

/** @deprecated Use KIDS_TTS_FEATURE — kept for legacy log rows */
export const KIDS_TTS_FEATURE_EN = 'tts_kids_en'
/** @deprecated Use KIDS_TTS_FEATURE — kept for legacy log rows */
export const KIDS_TTS_FEATURE_AR = 'tts_kids_ar'

export const KEY_LABEL_OPENROUTER = 'OpenRouter'
export const KEY_LABEL_DEEPGRAM = 'Deepgram'
export const KEY_LABEL_OPENAI = 'OpenAI'

const GPT_PRICING: Record<string, { input: number; output: number }> = {
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'meta-llama/llama-3.1-8b-instruct': { input: 0.06, output: 0.06 },
}

let cachedSystemUsageUserId: string | null | undefined

/** Resolve userId for usage logs (bulk/offline scripts and optional-auth endpoints). */
export async function resolveUsageUserId(userId?: string): Promise<string | undefined> {
  if (userId) return userId

  if (cachedSystemUsageUserId !== undefined) {
    return cachedSystemUsageUserId || undefined
  }

  const envId = process.env.AI_USAGE_SYSTEM_USER_ID
  if (envId) {
    cachedSystemUsageUserId = envId
    return envId
  }

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@mujam.com'
  const admin = await prisma.user.findFirst({
    where: { email: adminEmail },
    select: { id: true },
  })
  if (admin) {
    cachedSystemUsageUserId = admin.id
    return admin.id
  }

  const fallbackAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  cachedSystemUsageUserId = fallbackAdmin?.id ?? null
  return cachedSystemUsageUserId || undefined
}

/** Deepgram Nova STT — ~$0.0043 / minute */
export function estimateSttCostUsd(durationSeconds: number): number {
  return (durationSeconds / 60) * 0.0043
}

/** Deepgram Aura TTS — $0.015 / 1k characters */
export function estimateTtsCostUsd(characters: number): number {
  return (characters / 1_000) * 0.015
}

/** OpenRouter Gemini TTS — ~$1 / 1M input chars (audio output priced separately on provider) */
export function estimateOpenRouterTtsCostUsd(characters: number): number {
  return (characters / 1_000_000) * 1.0
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

export function isKidsTtsFeature(feature?: string | null): boolean {
  if (!feature) return false
  return (
    feature === KIDS_TTS_FEATURE ||
    feature === KIDS_TTS_BULK_FEATURE ||
    feature === KIDS_TTS_FEATURE_EN ||
    feature === KIDS_TTS_FEATURE_AR
  )
}

export async function logAIUsage(params: {
  userId: string
  service: AIServiceName
  feature?: string
  provider?: AIProvider
  model?: string
  keyLabel?: string
  tokens?: number
  characters?: number
  outputBytes?: number
  durationMin?: number
  costUsd: number
}): Promise<void> {
  if (!params.userId || params.costUsd < 0) return
  try {
    await prisma.aIUsageLog.create({
      data: {
        userId: params.userId,
        service: params.service,
        feature: params.feature,
        provider: params.provider,
        model: params.model,
        keyLabel: params.keyLabel,
        tokens: params.tokens,
        characters: params.characters,
        outputBytes: params.outputBytes,
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
  completionTokens: number,
  options?: { feature?: string; provider?: AIProvider; keyLabel?: string }
): Promise<void> {
  const provider = options?.provider ?? (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai')
  const keyLabel =
    options?.keyLabel ??
    (provider === 'openrouter' ? KEY_LABEL_OPENROUTER : KEY_LABEL_OPENAI)

  await logAIUsage({
    userId,
    service: 'gpt',
    feature: options?.feature ?? CHAT_FEATURE,
    provider,
    model,
    keyLabel,
    tokens: promptTokens + completionTokens,
    costUsd: estimateGptCostUsd(model, promptTokens, completionTokens),
  })
}

export async function logDeepgramSttUsage(
  userId: string,
  durationSeconds: number,
  model?: string
): Promise<void> {
  await logAIUsage({
    userId,
    service: 'deepgram',
    feature: STT_FEATURE,
    provider: 'deepgram',
    model: model || process.env.DEEPGRAM_STT_MODEL || 'nova-2',
    keyLabel: KEY_LABEL_DEEPGRAM,
    durationMin: durationSeconds / 60,
    costUsd: estimateSttCostUsd(durationSeconds),
  })
}

export async function logDeepgramTtsUsage(
  userId: string,
  text: string,
  options?: { feature?: string; model?: string; outputBytes?: number }
): Promise<void> {
  const characters = text.length
  const voice = options?.model || process.env.AI_TTS_VOICE_EN || 'aura-asteria-en'
  await logAIUsage({
    userId,
    service: 'deepgram-tts',
    feature: options?.feature ?? TTS_FEATURE,
    provider: 'deepgram',
    model: voice,
    keyLabel: KEY_LABEL_DEEPGRAM,
    characters,
    outputBytes: options?.outputBytes,
    costUsd: estimateTtsCostUsd(characters),
  })
}

export async function logOpenRouterTtsUsage(
  userId: string,
  text: string,
  model: string,
  options?: { feature?: string; outputBytes?: number }
): Promise<void> {
  const characters = text.length
  await logAIUsage({
    userId,
    service: 'openrouter-tts',
    feature: options?.feature ?? TTS_FEATURE,
    provider: 'openrouter',
    model,
    keyLabel: KEY_LABEL_OPENROUTER,
    characters,
    outputBytes: options?.outputBytes,
    costUsd: estimateOpenRouterTtsCostUsd(characters),
  })
}

export function kidsTtsFeature(bulk = false): string {
  return bulk ? KIDS_TTS_BULK_FEATURE : KIDS_TTS_FEATURE
}

export function serviceDisplayLabel(
  service: string,
  feature?: string | null,
  model?: string | null
): string {
  if (isKidsTtsFeature(feature)) {
    if (feature === KIDS_TTS_BULK_FEATURE) return 'Kids TTS — Bulk'
    if (feature === KIDS_TTS_FEATURE_EN) return 'Kids TTS — English'
    if (feature === KIDS_TTS_FEATURE_AR) return 'Kids TTS — Arabic'
    return 'Kids TTS'
  }
  if (model) return model
  switch (service) {
    case 'deepgram':
      return 'Deepgram STT'
    case 'deepgram-tts':
      return 'Deepgram TTS'
    case 'openrouter-tts':
      return 'OpenRouter TTS (Gemini)'
    case 'gpt':
      return 'GPT / OpenRouter'
    default:
      return service
  }
}

export function featureDisplayLabel(feature: string): string {
  switch (feature) {
    case KIDS_TTS_FEATURE:
      return 'Kids TTS — On-demand'
    case KIDS_TTS_BULK_FEATURE:
      return 'Kids TTS — Bulk'
    case KIDS_TTS_FEATURE_EN:
      return 'Kids TTS — English (legacy)'
    case KIDS_TTS_FEATURE_AR:
      return 'Kids TTS — Arabic (legacy)'
    case CHAT_FEATURE:
      return 'محادثة AI'
    case STT_FEATURE:
      return 'تحويل صوت لنص'
    case TTS_FEATURE:
      return 'تحويل نص لصوت'
    default:
      return feature
  }
}

export function serviceTypeLabel(service: string, feature?: string | null): string {
  if (isKidsTtsFeature(feature)) return 'kids-tts'
  switch (service) {
    case 'deepgram':
      return 'stt'
    case 'deepgram-tts':
    case 'openrouter-tts':
      return 'tts'
    case 'gpt':
      return 'chat'
    default:
      return service
  }
}

export type UsageBreakdownRow = {
  key: string
  label: string
  count: number
  costUsd: number
  characters: number
  tokens: number
  outputBytes: number
  durationMin: number
}

export function aggregateUsageBreakdown(
  logs: Array<{
    provider: string | null
    model: string | null
    keyLabel: string | null
    feature: string | null
    service: string
    costUsd: number
    characters: number | null
    tokens: number | null
    outputBytes: number | null
    durationMin: number | null
  }>,
  groupBy: 'provider' | 'keyLabel' | 'model' | 'feature'
): UsageBreakdownRow[] {
  const map = new Map<string, UsageBreakdownRow>()

  for (const log of logs) {
    let key: string
    let label: string

    switch (groupBy) {
      case 'provider':
        key = log.provider || log.service || 'unknown'
        label = key === 'openrouter' ? 'OpenRouter' : key === 'deepgram' ? 'Deepgram' : key === 'openai' ? 'OpenAI' : key
        break
      case 'keyLabel':
        key = log.keyLabel || 'Unknown'
        label = key
        break
      case 'model':
        key = log.model || serviceDisplayLabel(log.service, log.feature)
        label = key
        break
      case 'feature':
        key = log.feature || serviceTypeLabel(log.service, log.feature)
        label = log.feature ? featureDisplayLabel(log.feature) : serviceTypeLabel(log.service, log.feature)
        break
      default:
        key = 'unknown'
        label = 'Unknown'
    }

    const row = map.get(key) || {
      key,
      label,
      count: 0,
      costUsd: 0,
      characters: 0,
      tokens: 0,
      outputBytes: 0,
      durationMin: 0,
    }
    row.count += 1
    row.costUsd += log.costUsd
    row.characters += log.characters || 0
    row.tokens += log.tokens || 0
    row.outputBytes += log.outputBytes || 0
    row.durationMin += log.durationMin || 0
    map.set(key, row)
  }

  return Array.from(map.values()).sort((a, b) => b.costUsd - a.costUsd)
}
