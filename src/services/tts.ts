import axios from 'axios';

interface TTSOptions {
  speed?: number; // 0.5 to 2.0, default 1.0
  voice?: string; // Voice ID, default 'en-US-Standard-A'
}

/**
 * Convert text to speech using Google Cloud TTS or OpenAI TTS
 * @param text - Text to convert to speech
 * @param options - TTS options (speed, voice)
 * @returns Audio buffer (MP3 format)
 */
export const textToSpeech = async (
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> => {
  const { speed = 1.0, voice = 'en-US-Standard-A' } = options;

  // Check if we have API keys configured
  const hasGoogleTTS = !!process.env.GOOGLE_TTS_API_KEY;
  const hasOpenAITTS = !!process.env.OPENAI_API_KEY;

  if (!hasGoogleTTS && !hasOpenAITTS) {
    console.warn('No TTS API keys configured - returning mock audio');
    return generateMockAudio(text, speed);
  }

  try {
    if (hasOpenAITTS) {
      return await generateOpenAITTS(text, speed);
    } else {
      return await generateGoogleTTS(text, speed, voice);
    }
  } catch (error) {
    console.error('TTS generation error:', error);
    // Fallback to mock audio
    return generateMockAudio(text, speed);
  }
};

/**
 * Generate speech using OpenAI TTS API
 */
async function generateOpenAITTS(text: string, speed: number): Promise<Buffer> {
  const response = await axios.post(
    'https://api.openai.com/v1/audio/speech',
    {
      model: 'tts-1',
      input: text,
      voice: 'alloy',
      speed: speed,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}

/**
 * Generate speech using Google Cloud TTS API
 */
async function generateGoogleTTS(
  text: string,
  speed: number,
  voice: string
): Promise<Buffer> {
  const response = await axios.post(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
    {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: voice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speed,
      },
    }
  );

  // Google returns base64 encoded audio
  return Buffer.from(response.data.audioContent, 'base64');
}

/**
 * Generate mock audio for development/testing
 * Returns a minimal valid MP3 buffer
 */
function generateMockAudio(text: string, speed: number): Buffer {
  console.log(`[TTS MOCK] Generating audio for: "${text}" at speed ${speed}`);
  
  // Return a minimal valid MP3 header (silent audio)
  // This is just for development - in production, real TTS should be used
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, // MP3 sync word and header
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);

  // Repeat header to create a longer "silent" file
  const frames = 100;
  const buffers = Array(frames).fill(mp3Header);
  
  return Buffer.concat(buffers);
}

/**
 * Batch generate TTS for multiple texts
 * @param texts - Array of texts to convert
 * @param options - TTS options
 * @returns Array of audio buffers
 */
export const batchTextToSpeech = async (
  texts: string[],
  options: TTSOptions = {}
): Promise<Buffer[]> => {
  const results: Buffer[] = [];

  for (const text of texts) {
    try {
      const audio = await textToSpeech(text, options);
      results.push(audio);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate TTS for: "${text}"`, error);
      // Push mock audio on error
      results.push(generateMockAudio(text, options.speed || 1.0));
    }
  }

  return results;
};
