import { createClient } from '@deepgram/sdk';

// Initialize Deepgram client with API key
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

export default deepgram;
