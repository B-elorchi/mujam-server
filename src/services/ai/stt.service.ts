import deepgram from '../../config/deepgram'
import prisma from '../../config/database'
import { Readable } from 'stream'

export interface STTResult {
    transcript: string
    language: string
    duration: number
    words?: Array<{ word: string; start: number; end: number }>
}

export async function transcribeAudio(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    language?: string,
    prompt?: string
): Promise<STTResult> {
    // Check if buffer has actual audio data (not just silence)
    const hasAudioData = buffer.some(byte => byte !== 0)

    console.log('Starting transcription:', {
        bufferSize: buffer.length,
        mimeType,
        userId,
        hasNonZeroBytes: hasAudioData,
        firstBytes: buffer.slice(0, 20).toString('hex')
    })

    if (!hasAudioData) {
        console.warn('Audio buffer appears to be empty or silent')
    }

    // Use Deepgram for speech-to-text transcription
    // Use appropriate model based on language
    const detectedLanguage = language || 'en'
    const transcriptionOptions: any = {
        // nova-2 supports English, but Arabic needs 'general' model
        model: detectedLanguage === 'ar' ? 'general' : 'nova-2',
        language: detectedLanguage,
        punctuate: true,
        smart_format: true,
        diarize: false,
        utterances: false,
    }

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        transcriptionOptions
    )

    if (error) {
        console.error('Deepgram error:', error)
        throw new Error(`Deepgram transcription failed: ${error}`)
    }

    console.log('Deepgram raw result:', JSON.stringify(result, null, 2))

    if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
        throw new Error('No transcription result from Deepgram')
    }

    const alternative = result.results.channels[0].alternatives[0]
    const metadata = result.metadata

    const transcript = alternative.transcript?.trim() || ''

    // Log the transcription for debugging
    console.log('Deepgram transcription:', {
        transcript,
        transcriptLength: transcript.length,
        language: (metadata as any)?.detected_language,
        duration: metadata?.duration,
        hasWords: !!alternative.words?.length,
        wordCount: alternative.words?.length || 0
    })

    if (!transcript) {
        console.error('Empty transcript - full alternative:', alternative)
        throw new Error('Deepgram returned empty transcript')
    }

    const sttResult: STTResult = {
        transcript,
        language: (metadata as any)?.detected_language || 'ar',
        duration: metadata?.duration || 0,
        words: alternative.words?.map(w => ({
            word: w.word,
            start: w.start,
            end: w.end,
        })),
    }

    // Log cost
    await logSTTCost(userId, sttResult.duration)

    return sttResult
}



// Generate word-level timing for shadowing stories
export async function generateWordTiming(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    expectedText: string
): Promise<Array<{ word: string; start: number; end: number }>> {
    console.log('Generating word timing for shadowing story...')

    // Shadowing stories are in English, so pass 'en' as language and expectedText as prompt
    const result = await transcribeAudio(userId, buffer, mimeType, 'en', expectedText)

    if (!result.words || result.words.length === 0) {
        console.warn('No word-level timing returned from Deepgram')
        // Fallback: split text into words and estimate timing
        const words = expectedText.split(/\s+/)
        const estimatedDuration = result.duration || 10
        const timePerWord = estimatedDuration / words.length

        return words.map((word, index) => ({
            word: word.trim(),
            start: index * timePerWord,
            end: (index + 1) * timePerWord,
        }))
    }

    return result.words
}

async function logSTTCost(userId: string, durationSeconds: number) {
    // Deepgram Nova-2 pricing: ~$0.0043 per minute
    const costPerMinute = 0.0043
    const costUsd = (durationSeconds / 60) * costPerMinute
    await prisma.aIUsageLog.create({
        data: {
            userId,
            service: 'deepgram',
            durationMin: durationSeconds / 60,
            costUsd,
        },
    })
}
