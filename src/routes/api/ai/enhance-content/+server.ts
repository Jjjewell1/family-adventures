import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const { content, fieldName } = await request.json();

  if (!content?.trim()) return json({ error: 'No content to enhance' }, { status: 400 });

  const isStory = fieldName === 'content';
  const system = isStory
    ? `You are a writing assistant for a family travel journal. Enhance the given text to be more vivid, engaging, and emotionally resonant while keeping the original meaning and personal voice. Fix grammar and spelling. Maintain the same approximate length. Return only the enhanced text with no commentary.`
    : `You are a writing assistant for a family travel journal. Enhance the given description to be more vivid, compelling, and well-written while keeping the original meaning. Fix grammar and spelling. Return only the enhanced text with no commentary.`;

  const prompt = `Enhance this ${isStory ? 'story' : 'description'} for a family adventure journal:

"${content}"

Return only the improved text, nothing else.`;

  const result = await generateText({ prompt, system, temperature: 0.5, num_predict: 1024 });

  if (!result) return json({ error: 'Failed to enhance content' }, { status: 500 });
  return json({ result: result.trim() });
};
