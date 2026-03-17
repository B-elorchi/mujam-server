import deepgram from '../../config/deepgram'
import prisma from '../../config/database'

// Deepgram Aura voices
export type TTSVoice = 'aura-asteria-en' | 'aura-luna-en' | 'aura-stella-en' | 'aura-athena-en' | 'aura-hera-en' | 'aura-orion-en' | 'aura-arcas-en' | 'aura-perseus-en' | 'aura-angus-en' | 'aura-orpheus-en' | 'aura-helios-en' | 'aura-zeus-en'

export interface TTSOptions {
    voice?: TTSVoice
    speed?: number
    model?: string
}

export async function textToSpeech(
    text: string,
    speed: 'normal' | 'slow' = 'normal',
    userId?: string
): Promise<Buffer> {
    const voice = (process.env.AI_TTS_VOICE as TTSVoice) || 'aura-asteria-en'

    try {
        const response = await deepgram.speak.request(
            { text },
            {
                model: voice, // Use the voice name as the model for Deepgram Aura
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

        // Log cost only if userId is provided
        if (userId) {
            await logTTSCost(userId, text)
        }

        return buffer
    } catch (error: any) {
        console.error('Deepgram TTS error:', error)
        throw new Error(`TTS failed: ${error.message}`)
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

async function logTTSCost(userId: string, text: string) {
    const charCount = text.length
    // Deepgram Aura pricing: $0.015 per 1,000 characters
    const costPer1K = 0.015
    const costUsd = (charCount / 1_000) * costPer1K
    await prisma.aIUsageLog.create({
        data: {
            userId,
            service: 'deepgram-tts',
            characters: charCount,
            costUsd,
        },
    })
}
