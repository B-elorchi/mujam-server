import deepgram from '../../config/deepgram'
import { logDeepgramTtsUsage } from './usage.service'

/** Deepgram Aura TTS languages (see https://developers.deepgram.com/docs/tts-models) */
export const DEEPGRAM_AURA_TTS_LANGUAGES = ['en', 'es', 'de', 'fr', 'nl', 'it', 'ja'] as const

/** Deepgram Aura does not offer Arabic TTS — use browser speechSynthesis on the client. */
export const DEEPGRAM_ARABIC_TTS_SUPPORTED = false

export class ArabicTtsUnsupportedError extends Error {
    constructor() {
        super(
            'Deepgram Aura TTS does not support Arabic. Supported languages: en, es, de, fr, nl, it, ja. Use browser speech synthesis for Arabic audio.'
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
}

// Detect language from text (simple heuristic)
function detectLanguage(text: string): 'en' | 'ar' {
    // Check if text contains Arabic characters
    const arabicPattern = /[\u0600-\u06FF]/
    return arabicPattern.test(text) ? 'ar' : 'en'
}

export async function textToSpeech(
    text: string,
    speed: 'normal' | 'slow' = 'normal',
    userId?: string,
    language?: 'en' | 'ar'
): Promise<Buffer> {
    // Check Deepgram API key is configured
    if (!process.env.DEEPGRAM_API_KEY) {
        console.error('DEEPGRAM_API_KEY is not configured')
        throw new Error('TTS configuration error: Deepgram API key is missing')
    }

    // Validate text input
    if (!text || text.trim().length === 0) {
        throw new Error('TTS error: Empty text provided')
    }

    // Auto-detect language if not provided
    const detectedLang = language || detectLanguage(text)

    if (detectedLang === 'ar') {
        throw new ArabicTtsUnsupportedError()
    }

    const voice = (process.env.AI_TTS_VOICE_EN as TTSVoiceEN) || 'aura-asteria-en'
    assertAuraEnglishVoice(voice)

    console.log(`TTS: Generating audio for ${detectedLang} text with voice ${voice}`)

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

        // Convert stream to buffer
        const chunks: Buffer[] = []
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk))
        }
        const buffer = Buffer.concat(chunks)

        if (userId) {
            await logDeepgramTtsUsage(userId, text)
        }

        return buffer
    } catch (error: any) {
        console.error('Deepgram TTS error:', error)
        const msg = error?.message ?? String(error)
        if (/No such model\/version combination found/i.test(msg)) {
            throw new Error(
                `TTS failed: Deepgram model "${voice}" is invalid or unavailable. Check AI_TTS_VOICE_EN against https://developers.deepgram.com/docs/tts-models`
            )
        }
        throw new Error(`TTS failed: ${msg}`)
    }
}

export async function textToSpeechSlow(text: string, userId?: string): Promise<Buffer> {
    // Deepgram doesn't support speed parameter, so we generate normal speed
    // and let the frontend handle playback speed control
    // Or use ffmpeg/audio processing library to slow down the audio
    
    // For now, generate normal audio and add a note that frontend should use playbackRate
    // TODO: Implement audio processing with ffmpeg to actually slow down the audio file
    return textToSpeech(text, 'slow', userId)
}
