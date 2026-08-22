import deepgram from '../../config/deepgram'
import prisma from '../../config/database'
import { Readable } from 'stream'

export interface STTResult {
    transcript: string
    language: string
    duration: number
    words?: Array<{ word: string; start: number; end: number }>
}

export function detectTranscriptLanguage(text?: string): 'en' | 'ar' | undefined {
    if (!text || !text.trim()) return undefined
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en'
}

function extractKeyterms(text: string, limit = 40): string[] {
    const seen = new Set<string>()
    const terms: string[] = []
    for (const raw of text.split(/\s+/)) {
        const word = raw.replace(/[^\p{L}\p{N}']/gu, '').trim()
        if (word.length < 2) continue
        const key = word.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        terms.push(word)
        if (terms.length >= limit) break
    }
    return terms
}

export async function transcribeAudio(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    language?: string,
    prompt?: string
): Promise<STTResult> {
    // Check Deepgram API key is configured
    if (!process.env.DEEPGRAM_API_KEY) {
        console.error('DEEPGRAM_API_KEY is not configured')
        throw new Error('CONFIG_ERROR: Speech recognition service is not properly configured.')
    }

    // Check minimum audio size (at least 1KB for valid audio)
    if (buffer.length < 1024) {
        console.warn('Audio buffer too small:', buffer.length, 'bytes')
        throw new Error('AUDIO_TOO_SHORT: The recording is too short. Please speak for at least 1-2 seconds.')
    }

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
        throw new Error('AUDIO_SILENT: No audio detected. Please check your microphone and try again.')
    }

    const detectedLanguage = language || detectTranscriptLanguage(prompt) || 'multi'
    const keyterms = prompt ? extractKeyterms(prompt) : []

    console.log('STT Language Detection:', {
        providedLanguage: language,
        detectedLanguage,
        keytermCount: keyterms.length,
        willUseModel: 'nova-3'
    })

    const transcriptionOptions: Record<string, unknown> = {
        model: 'nova-3',
        punctuate: true,
        smart_format: true,
        words: true,
        diarize: false,
        utterances: false,
        ...(detectedLanguage !== 'multi' && { language: detectedLanguage }),
        ...(keyterms.length > 0 && { keyterm: keyterms }),
    }

    console.log('STT Transcription Options:', transcriptionOptions)

    let { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        transcriptionOptions as any
    )

    // Nova-3 keyterm is best-effort; retry without it if Deepgram rejects the option
    if (error && keyterms.length > 0) {
        console.warn('STT retrying without keyterms:', error)
        const { keyterm: _ignored, ...withoutKeyterms } = transcriptionOptions
        const retry = await deepgram.listen.prerecorded.transcribeFile(
            buffer,
            withoutKeyterms as any
        )
        result = retry.result
        error = retry.error
    }

    if (error) {
        console.error('Deepgram error:', error)
        throw new Error(`Deepgram transcription failed: ${error}`)
    }

    console.log('Deepgram raw result:', JSON.stringify(result, null, 2))

    if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
        throw new Error('NO_RESULT: No transcription result from Deepgram. Please try speaking more clearly.')
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
        wordCount: alternative.words?.length || 0,
        confidence: alternative.confidence
    })

    // Handle empty transcript gracefully - return empty result instead of throwing
    if (!transcript) {
        console.warn('Empty transcript received - speech may not be recognized:', {
            confidence: alternative.confidence,
            words: alternative.words?.length || 0
        })
        // Return empty result with warning flag
        return {
            transcript: '',
            language: (metadata as any)?.detected_language || 'unknown',
            duration: metadata?.duration || 0,
            words: [],
        }
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

    const language = detectTranscriptLanguage(expectedText)
    const result = await transcribeAudio(userId, buffer, mimeType, language, expectedText)
    const expectedWords = expectedText.trim().split(/\s+/).filter(Boolean)

    if (!result.words || result.words.length === 0) {
        console.warn('No word-level timing returned from Deepgram')
        const estimatedDuration = result.duration || Math.max(4, expectedWords.length * 0.45)
        const timePerWord = estimatedDuration / Math.max(expectedWords.length, 1)

        return expectedWords.map((word, index) => ({
            word,
            start: index * timePerWord,
            end: (index + 1) * timePerWord,
        }))
    }

    // Keep timestamps from STT but label with the story words when counts match,
    // so karaoke highlighting lines up with the text the student sees.
    if (result.words.length === expectedWords.length) {
        return expectedWords.map((word, index) => ({
            word,
            start: result.words![index].start,
            end: result.words![index].end,
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
