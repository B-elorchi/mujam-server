import deepgram from '../../config/deepgram'
import { openrouter } from '../../config/openrouter'
import { logDeepgramTtsUsage, logOpenRouterTtsUsage } from './usage.service'

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

export interface TTSOptions {
    voice?: TTSVoice
    speed?: number
    model?: string
    language?: 'en' | 'ar'
    provider?: TtsProviderMode
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
    const mode = override ?? getConfiguredTtsProviderMode()

    if (mode === 'deepgram') return 'deepgram'
    if (mode === 'openrouter') return 'openrouter'

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

async function openRouterTextToSpeech(
    text: string,
    lang: 'en' | 'ar',
    userId?: string
): Promise<TtsAudioResult> {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('TTS configuration error: OPENROUTER_API_KEY is missing')
    }

    const model = process.env.OPENROUTER_TTS_MODEL || OPENROUTER_GEMINI_TTS_MODEL_DEFAULT
    const voice = openRouterVoiceForLang(lang)

    console.log(`TTS (OpenRouter): Generating ${lang} audio with ${model}, voice ${voice}`)

    try {
        const response = await openrouter.audio.speech.create({
            model,
            input: text,
            voice,
            response_format: 'pcm',
        })

        const pcm = Buffer.from(await response.arrayBuffer())
        if (pcm.length === 0) {
            throw new Error('OpenRouter TTS returned empty audio')
        }

        const buffer = pcmToWav(pcm)

        if (userId) {
            await logOpenRouterTtsUsage(userId, text, model)
        }

        return {
            buffer,
            contentType: 'audio/wav',
            provider: 'openrouter',
            extension: 'wav',
        }
    } catch (error: unknown) {
        console.error('OpenRouter TTS error:', error)
        const msg = error instanceof Error ? error.message : String(error)
        throw new Error(`TTS failed (OpenRouter): ${msg}`)
    }
}

async function deepgramTextToSpeech(
    text: string,
    lang: 'en' | 'ar',
    userId?: string
): Promise<TtsAudioResult> {
    if (!process.env.DEEPGRAM_API_KEY) {
        throw new Error('TTS configuration error: Deepgram API key is missing')
    }

    if (lang === 'ar') {
        throw new ArabicTtsUnsupportedError()
    }

    const voice = (process.env.AI_TTS_VOICE_EN as TTSVoiceEN) || 'aura-asteria-en'
    assertAuraEnglishVoice(voice)

    console.log(`TTS (Deepgram): Generating ${lang} audio with voice ${voice}`)

    try {
        const response = await deepgram.speak.request(
            { text },
            {
                model: voice,
                encoding: 'mp3',
            }
        )

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
            await logDeepgramTtsUsage(userId, text)
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
    options?: Pick<TTSOptions, 'provider'>
): Promise<TtsAudioResult> {
    void speed // Deepgram/OpenRouter Gemini do not expose speed; frontend uses playbackRate

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
        return openRouterTextToSpeech(text, detectedLang, userId)
    }

    try {
        return await deepgramTextToSpeech(text, detectedLang, userId)
    } catch (error) {
        if (
            error instanceof ArabicTtsUnsupportedError ||
            !isOpenRouterTtsConfigured() ||
            options?.provider === 'deepgram'
        ) {
            throw error
        }
        console.warn('Deepgram TTS failed, falling back to OpenRouter:', error)
        return openRouterTextToSpeech(text, detectedLang, userId)
    }
}

export async function textToSpeechSlow(
    text: string,
    userId?: string,
    language?: 'en' | 'ar',
    options?: Pick<TTSOptions, 'provider'>
): Promise<TtsAudioResult> {
    return textToSpeech(text, 'slow', userId, language, options)
}
