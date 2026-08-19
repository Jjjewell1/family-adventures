import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const { title, description, locationName, photoCount, existingCaptions } = await request.json();

  const system = `You are a photo caption generator for a family travel journal. 
Write short, warm, descriptive captions for photos from a family adventure. 
Each caption should be one sentence, capturing what might be happening in the photo. 
Return a JSON array of strings, one caption per photo. Be creative and vary the captions.`;

  const existingContext = existingCaptions?.length
    ? `\nSome photos already have captions: ${existingCaptions.join(', ')}`
    : '';

  const prompt = `Generate ${photoCount || 5} photo captions for a family adventure:
${title ? `Trip: ${title}` : ''}
${locationName ? `Location: ${locationName}` : ''}
${description ? `About: ${description}` : ''}
${existingContext}

Return a JSON array of caption strings like: ["Caption 1", "Caption 2", ...]`;

  const result = await generateText({ prompt, system, temperature: 0.8, num_predict: 512, format: 'json' });

  if (!result) return json({ error: 'Failed to generate captions' }, { status: 500 });

  try {
    const captions = JSON.parse(result);
    return json({ captions: Array.isArray(captions) ? captions : [result] });
  } catch {
    return json({ error: 'Failed to parse AI response' }, { status: 500 });
  }
};
