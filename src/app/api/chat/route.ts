import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { retrieveChunks } from '@/lib/ai/rag';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1].content;

  const relevantChunks = await retrieveChunks(lastMessage);

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: `You are a medical policy analyst. Answer questions about drug coverage
policies using only the provided context. Always cite the payer name,
plan name, policy number, and effective date.`,
    messages: [
      ...messages.slice(0, -1),
      {
        role: 'user' as const,
        content: `Context:\n${relevantChunks.map(c => c.chunkText).join('\n---\n')}\n\nQuestion: ${lastMessage}`,
      },
    ],
  });

  return result.toUIMessageStreamResponse();
}
