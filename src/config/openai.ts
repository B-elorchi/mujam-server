import OpenAI from 'openai';
import { estimateTokens, logGptUsage } from '../services/ai/usage.service';

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
  temperature: number = 0.7,
  userId?: string
): Promise<{ content: string }> {
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
  });
  const content = response.choices[0]?.message?.content || '';

  if (userId) {
    const promptTokens =
      response.usage?.prompt_tokens ||
      estimateTokens(messages.map((m) => m.content).join(' '));
    const completionTokens = response.usage?.completion_tokens || estimateTokens(content);
    await logGptUsage(userId, model, promptTokens, completionTokens);
  }

  return { content };
}