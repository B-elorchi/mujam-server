import OpenAI from 'openai';

// OpenRouter is OpenAI-compatible — same SDK, different baseURL
export const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL,
    defaultHeaders: {
        'HTTP-Referer': 'https://mujam.com',
        'X-Title': 'Mujam English Learning Platform',
    },
});
