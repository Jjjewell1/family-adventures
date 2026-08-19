import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const { description, content } = await request.json();
  const text = [description, content].filter(Boolean).join('\n\n');

  if (!text.trim()) return json({ error: 'No content to summarize' }, { status: 400 });

  const system = `You are a concise summarizer for a family travel journal. 
Write a 1-2 sentence summary capturing the essence of this adventure. 
Be warm and vivid. Plain text only, no markdown.`;

  const prompt = `Summarize this adventure in 1-2 sentences:

"${text}"`;

  const result = await generateText({ prompt, system, temperature: 0.4, num_predict: 128 });

  if (!result) return json({ error: 'Failed to generate summary' }, { status: 500 });
  return json({ result: result.trim() });
};
