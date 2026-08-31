import deepgram from '../../config/deepgram'
import { openrouter } from '../../config/openrouter'
import { logDeepgramTtsUsage, logOpenRouterTtsUsage, kidsTtsFeature } from './usage.service'

/** Deepgram Aura TTS languages (see https://developers.deepgram.com/docs/tts-models) */
export const DEEPGRAM_AURA_TTS_LANGUAGES = ['en', 'es', 'de', 'fr', 'nl', 'it', 'ja'] as const

/** Deepgram Aura does not offer Arabic TTS — use OpenRouter Gemini or browser speechSynthesis. */
export const DEEPGRAM_ARABIC_TTS_SUPPORTED = false

export const OPENROUTER_GEMINI_TTS_MODEL_DEFAULT = 'google/gemini-3.1-flash-tts-preview'

/** Gemini TTS via OpenRouter outputs 24 kHz 16-bit mono PCM (wrapped as WAV for playback). */
export const OPENROUTER_GEMINI_PCM_SAMPLE_RATE = 24_000

export type TtsProviderMode = 'deepgram' | 'openrouter' | 'auto'

export type TtsAudioContentType = 'audio/mpeg' | 'audio/wav'

export interface TtsAudioResult {
    buffer: Buffer
    contentType: TtsAudioContentType
    provider: 'deepgram' | 'openrouter'
    extension: 'mp3' | 'wav'
}

export class ArabicTtsUnsupportedError extends Error {
    constructor() {
        super(
            'Arabic TTS unavailable: Deepgram Aura has no Arabic voices. Set OPENROUTER_API_KEY and TTS_PROVIDER=auto (or openrouter) for Gemini TTS, or use browser speech synthesis.'
        )
        this.name = 'ArabicTtsUnsupportedError'
    }
}

// Deepgram Aura v1 English voices (also accepts aura-2-* variants via env override)
export type TTSVoiceEN =
    | 'aura-asteria-en'
    | 'aura-luna-en'
    | 'aura-stella-en'
    | 'aura-athena-en'
    | 'aura-hera-en'
    | 'aura-orion-en'
    | 'aura-arcas-en'
    | 'aura-perseus-en'
    | 'aura-angus-en'
    | 'aura-orpheus-en'
    | 'aura-helios-en'
    | 'aura-zeus-en'

export type TTSVoice = TTSVoiceEN

/** Sample of known-valid Aura English model IDs (v1 + v2). */
export const VALID_AURA_EN_VOICES: readonly string[] = [
    'aura-asteria-en',
    'aura-luna-en',
    'aura-stella-en',
    'aura-athena-en',
    'aura-hera-en',
    'aura-orion-en',
    'aura-arcas-en',
    'aura-perseus-en',
    'aura-angus-en',
    'aura-orpheus-en',
    'aura-helios-en',
    'aura-zeus-en',
    'aura-2-asteria-en',
    'aura-2-thalia-en',
    'aura-2-luna-en',
    'aura-2-hera-en',
]

export function isValidAuraEnglishVoice(voice: string): boolean {
    return VALID_AURA_EN_VOICES.includes(voice) || /^aura(-2)?-[a-z]+-en$/.test(voice)
}

export function assertAuraEnglishVoice(voice: string): void {
    if (!isValidAuraEnglishVoice(voice)) {
        throw new Error(
            `Invalid Deepgram Aura English voice "${voice}". Examples: aura-asteria-en, aura-2-thalia-en. See https://developers.deepgram.com/docs/tts-models`
        )
    }
}

/** Deepgram Aura-2 speed query param range (https://developers.deepgram.com/docs/tts-voice-controls). */
export const DEEPGRAM_AURA2_SPEED_MIN = 0.7
export const DEEPGRAM_AURA2_SPEED_MAX = 1.5

export const KIDS_EN_TTS_SPEED_DEFAULT = 0.5

export function isAura2Voice(voice: string): boolean {
    return voice.startsWith('aura-2-')
}

/** Kids English playback speed from KIDS_TTS_SPEED_EN or AI_TTS_SPEED_EN (default 0.5). */
export function getKidsEnglishTtsSpeed(): number {
    const raw = process.env.KIDS_TTS_SPEED_EN ?? process.env.AI_TTS_SPEED_EN ?? String(KIDS_EN_TTS_SPEED_DEFAULT)
    const parsed = parseFloat(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : KIDS_EN_TTS_SPEED_DEFAULT
}

/** Map desired speed to Deepgram Aura-2 API speed (0.7–1.5). Aura-1 voices ignore speed. */
export function deepgramGenerationSpeed(desired: number, voice: string): number | undefined {
    if (!isAura2Voice(voice)) return undefined
    if (desired >= DEEPGRAM_AURA2_SPEED_MIN && desired <= DEEPGRAM_AURA2_SPEED_MAX) return desired
    if (desired < DEEPGRAM_AURA2_SPEED_MIN) return DEEPGRAM_AURA2_SPEED_MIN
    return DEEPGRAM_AURA2_SPEED_MAX
}

export interface TTSOptions {
    voice?: TTSVoice
    speed?: number
    model?: string
    language?: 'en' | 'ar'
    provider?: TtsProviderMode
    /** Budget feature key, e.g. tts_kids_en */
    feature?: string
}

export function isOpenRouterTtsConfigured(): boolean {
    return !!process.env.OPENROUTER_API_KEY
}

export function isArabicServerTtsAvailable(): boolean {
    return isOpenRouterTtsConfigured()
}

export function getConfiguredTtsProviderMode(): TtsProviderMode {
    const mode = (process.env.TTS_PROVIDER || 'auto').toLowerCase()
    if (mode === 'deepgram' || mode === 'openrouter' || mode === 'auto') {
        return mode
    }
    return 'auto'
}

/** Resolve which backend synthesizes audio for a language (optional CLI/script override). */
export function resolveTtsProvider(lang: 'en' | 'ar', override?: TtsProviderMode): 'deepgram' | 'openrouter' {
    const explicit = override !== undefined
    const mode = override ?? getConfiguredTtsProviderMode()

    if (mode === 'deepgram') return 'deepgram'

    if (mode === 'openrouter') {
        // Explicit per-request override (e.g. bulk script --lang en --provider openrouter): honor it
        if (explicit) return 'openrouter'
        // TTS_PROVIDER=openrouter env: OpenRouter for Arabic; English stays on Deepgram when configured
        if (lang === 'en' && process.env.DEEPGRAM_API_KEY) return 'deepgram'
        return 'openrouter'
    }

    // auto: Deepgram for English, OpenRouter Gemini for Arabic
    return lang === 'ar' ? 'openrouter' : 'deepgram'
}

function detectLanguage(text: string): 'en' | 'ar' {
    const arabicPattern = /[\u0600-\u06FF]/
    return arabicPattern.test(text) ? 'ar' : 'en'
}

/** Wrap raw PCM in a WAV container (Gemini TTS on OpenRouter returns PCM only). */
export function pcmToWav(
    pcm: Buffer,
    sampleRate = OPENROUTER_GEMINI_PCM_SAMPLE_RATE,
    channels = 1,
    bitsPerSample = 16
): Buffer {
    const bytesPerSample = bitsPerSample / 8
    const blockAlign = channels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const header = Buffer.alloc(44)

    header.write('RIFF', 0)
    header.writeUInt32LE(36 + pcm.length, 4)
    header.write('WAVE', 8)
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(1, 20)
    header.writeUInt16LE(channels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(byteRate, 28)
    header.writeUInt16LE(blockAlign, 32)
    header.writeUInt16LE(bitsPerSample, 34)
    header.write('data', 36)
    header.writeUInt32LE(pcm.length, 40)

    return Buffer.concat([header, pcm])
}

function openRouterVoiceForLang(lang: 'en' | 'ar'): string {
    if (lang === 'ar') {
        return process.env.OPENROUTER_TTS_VOICE_AR || process.env.OPENROUTER_TTS_VOICE || 'Zephyr'
    }
    return process.env.OPENROUTER_TTS_VOICE_EN || process.env.OPENROUTER_TTS_VOICE || 'Zephyr'
}

function openRouterInputText(text: string, lang: 'en' | 'ar', desiredSpeed?: number): string {
    // Gemini TTS has no numeric speed param; [slow] tag steers pacing when kids EN speed is low.
    if (lang === 'en' && desiredSpeed !== undefined && desiredSpeed <= 0.75) {
        return `[slow] ${text}`
    }
    return text
}

/** Minimum raw PCM bytes — rejects empty/truncated provider streams. */
export const OPENROUTER_TTS_MIN_PCM_BYTES = 256

/** Minimum WAV file size (44-byte header + PCM payload). */
export const OPENROUTER_TTS_MIN_WAV_BYTES = 1024

export const OPENROUTER_TTS_MAX_ATTEMPTS = 5

/** Backoff delays after attempts 1–4 (attempt 5 is the last try). */
export const OPENROUTER_TTS_BACKOFF_MS = [1000, 2000, 4000, 8000] as const

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** HTTP 502/503/429, empty streams, and network blips are worth retrying. */
export function isTransientOpenRouterTtsError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error)
    return (
        /\b502\b|\b503\b|\b429\b/.test(msg) ||
        /empty audio/i.test(msg) ||
        /empty stream/i.test(msg) ||
        /InternalServerError/i.test(msg) ||
        /rate.?limit/i.test(msg) ||
        /ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(msg)
    )
}

function validateOpenRouterPcm(pcm: Buffer): void {
    if (pcm.length < OPENROUTER_TTS_MIN_PCM_BYTES) {
        throw new Error(
            `OpenRouter TTS returned empty or truncated audio (${pcm.length} bytes, min ${OPENROUTER_TTS_MIN_PCM_BYTES})`
        )
    }
}

function validateOpenRouterWav(buffer: Buffer): void {
    if (buffer.length < OPENROUTER_TTS_MIN_WAV_BYTES) {
        throw new Error(
            `OpenRouter TTS produced invalid WAV (${buffer.length} bytes, min ${OPENROUTER_TTS_MIN_WAV_BYTES})`
        )
    }
}

async function openRouterTtsOnce(
    text: string,
    lang: 'en' | 'ar',
    userId: string | undefined,
    desiredSpeed: number | undefined,
    feature: string | undefined,
    model: string,
    voice: string
): Promise<TtsAudioResult> {
    const response = await openrouter.audio.speech.create({
        model,
        input: openRouterInputText(text, lang, desiredSpeed),
        voice,
        response_format: 'pcm',
    })

    const pcm = Buffer.from(await response.arrayBuffer())
    validateOpenRouterPcm(pcm)

    const buffer = pcmToWav(pcm)
    validateOpenRouterWav(buffer)

    if (userId) {
        await logOpenRouterTtsUsage(userId, text, model, {
            feature,
            outputBytes: buffer.length,
        })
    }

    return {
        buffer,
        contentType: 'audio/wav',
        provider: 'openrouter',
        extension: 'wav',
    }
}

async function openRouterTextToSpeech(
    text: string,
    lang: 'en' | 'ar',
    userId?: string,
    desiredSpeed?: number,
    feature?: string
): Promise<TtsAudioResult> {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('TTS configuration error: OPENROUTER_API_KEY is missing')
    }

    const model = process.env.OPENROUTER_TTS_MODEL || OPENROUTER_GEMINI_TTS_MODEL_DEFAULT
    const voice = openRouterVoiceForLang(lang)

    console.log(`TTS (OpenRouter): Generating ${lang} audio with ${model}, voice ${voice}`)

    let lastError: Error | undefined

    for (let attempt = 0; attempt < OPENROUTER_TTS_MAX_ATTEMPTS; attempt++) {
        try {
            return await openRouterTtsOnce(text, lang, userId, desiredSpeed, feature, model, voice)
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error))
            const isLast = attempt >= OPENROUTER_TTS_MAX_ATTEMPTS - 1
            if (isLast || !isTransientOpenRouterTtsError(error)) {
                break
            }
            const delay =
                OPENROUTER_TTS_BACKOFF_MS[attempt] ??
                OPENROUTER_TTS_BACKOFF_MS[OPENROUTER_TTS_BACKOFF_MS.length - 1]
            console.warn(
                `OpenRouter TTS attempt ${attempt + 1}/${OPENROUTER_TTS_MAX_ATTEMPTS} failed (${lastError.message}); retrying in ${delay}ms…`
            )
            await sleep(delay)
        }
    }

    console.error('OpenRouter TTS error:', lastError)
    throw new Error(`TTS failed (OpenRouter): ${lastError?.message ?? 'unknown error'}`)
}

async function deepgramTextToSpeech(
    text: string,
    lang: 'en' | 'ar',
    userId?: string,
    desiredSpeed?: number,
    feature?: string
): Promise<TtsAudioResult> {
    if (!process.env.DEEPGRAM_API_KEY) {
        throw new Error('TTS configuration error: Deepgram API key is missing')
    }

    if (lang === 'ar') {
        throw new ArabicTtsUnsupportedError()
    }

    const voice = (process.env.AI_TTS_VOICE_EN as TTSVoiceEN) || 'aura-asteria-en'
    assertAuraEnglishVoice(voice)

    const apiSpeed = desiredSpeed !== undefined ? deepgramGenerationSpeed(desiredSpeed, voice) : undefined
    const speedNote =
        desiredSpeed !== undefined && apiSpeed !== undefined && desiredSpeed < apiSpeed
            ? ` (requested ${desiredSpeed}, Deepgram min ${DEEPGRAM_AURA2_SPEED_MIN})`
            : ''
    console.log(
        `TTS (Deepgram): Generating ${lang} audio with voice ${voice}${apiSpeed !== undefined ? ` at speed ${apiSpeed}` : ''}${speedNote}`
    )

    try {
        const speakOptions: Record<string, unknown> = {
            model: voice,
            encoding: 'mp3',
        }
        if (apiSpeed !== undefined) {
            speakOptions.speed = apiSpeed
        }

        const response = await deepgram.speak.request({ text }, speakOptions)

        const stream = await response.getStream()

        if (!stream) {
            throw new Error('Failed to get audio stream from Deepgram')
        }

        const chunks: Buffer[] = []
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk))
        }
        const buffer = Buffer.concat(chunks)

        if (userId) {
            await logDeepgramTtsUsage(userId, text, {
                feature,
                model: voice,
                outputBytes: buffer.length,
            })
        }

        return {
            buffer,
            contentType: 'audio/mpeg',
            provider: 'deepgram',
            extension: 'mp3',
        }
    } catch (error: unknown) {
        if (error instanceof ArabicTtsUnsupportedError) throw error
        console.error('Deepgram TTS error:', error)
        const msg = error instanceof Error ? error.message : String(error)
        if (/No such model\/version combination found/i.test(msg)) {
            throw new Error(
                `TTS failed: Deepgram model "${voice}" is invalid or unavailable. Check AI_TTS_VOICE_EN against https://developers.deepgram.com/docs/tts-models`
            )
        }
        throw new Error(`TTS failed (Deepgram): ${msg}`)
    }
}

export async function textToSpeech(
    text: string,
    speed: 'normal' | 'slow' = 'normal',
    userId?: string,
    language?: 'en' | 'ar',
    options?: Pick<TTSOptions, 'provider' | 'speed' | 'feature'>
): Promise<TtsAudioResult> {
    const numericSpeed = options?.speed ?? (speed === 'slow' ? 0.75 : undefined)
    const feature = options?.feature

    if (!text || text.trim().length === 0) {
        throw new Error('TTS error: Empty text provided')
    }

    const detectedLang = language || detectLanguage(text)
    const primary = resolveTtsProvider(detectedLang, options?.provider)

    if (primary === 'openrouter') {
        if (!isOpenRouterTtsConfigured()) {
            if (detectedLang === 'ar') {
                throw new ArabicTtsUnsupportedError()
            }
            throw new Error('TTS configuration error: OPENROUTER_API_KEY is missing')
        }
        return openRouterTextToSpeech(text, detectedLang, userId, numericSpeed, feature)
    }

    try {
        return await deepgramTextToSpeech(text, detectedLang, userId, numericSpeed, feature)
    } catch (error) {
        if (
            error instanceof ArabicTtsUnsupportedError ||
            !isOpenRouterTtsConfigured() ||
            options?.provider === 'deepgram'
        ) {
            throw error
        }
        console.warn('Deepgram TTS failed, falling back to OpenRouter:', error)
        return openRouterTextToSpeech(text, detectedLang, userId, numericSpeed, feature)
    }
}

/** Kids lesson TTS — slower English by default (KIDS_TTS_SPEED_EN / AI_TTS_SPEED_EN, default 0.5). Arabic unchanged. */
export async function textToSpeechForKids(
    text: string,
    lang: 'en' | 'ar',
    userId?: string,
    options?: Pick<TTSOptions, 'provider'> & { bulk?: boolean }
): Promise<TtsAudioResult> {
    const speed = lang === 'en' ? getKidsEnglishTtsSpeed() : undefined
    return textToSpeech(text, 'normal', userId, lang, {
        ...options,
        speed,
        feature: kidsTtsFeature(options?.bulk),
    })
}

export async function textToSpeechSlow(
    text: string,
    userId?: string,
    language?: 'en' | 'ar',
    options?: Pick<TTSOptions, 'provider'>
): Promise<TtsAudioResult> {
    return textToSpeech(text, 'slow', userId, language, options)
}
