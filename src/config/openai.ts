import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function gpt(
  messages: ChatMessage[],
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7
): Promise<{ content: string }> {
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
  });
  return { content: response.choices[0]?.message?.content || '' };
}