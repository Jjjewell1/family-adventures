import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';
import { dbAll } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const { title, description, content, locationName, templateType } = await request.json();
  const existingTags = await dbAll<{ id: string; name: string; color: string }>('SELECT id, name, color FROM tags ORDER BY name');
  const tagNames = existingTags.map(t => t.name);

  const system = `You are a smart tagging assistant for a family travel journal. 
Suggest relevant tags for this adventure. Use existing tags when they fit, and suggest new ones when appropriate. 
Return a JSON array of objects with "name" (string) and "isNew" (boolean) fields. 
Return 3-8 tags. Only return the JSON array, nothing else.`;

  const prompt = `Suggest tags for this adventure:
Title: ${title || 'Untitled'}
${locationName ? `Location: ${locationName}` : ''}
${templateType ? `Type: ${templateType}` : ''}
${description ? `Description: ${description}` : ''}
${content ? `Story: ${content.substring(0, 500)}` : ''}

Existing tags in the system: ${tagNames.join(', ') || 'none yet'}

Return a JSON array like [{"name": "Beach", "isNew": false}, {"name": "Snorkeling", "isNew": true}]`;

  const result = await generateText({ prompt, system, temperature: 0.3, num_predict: 512, format: 'json' });

  if (!result) return json({ error: 'Failed to suggest tags' }, { status: 500 });

  try {
    const tags = JSON.parse(result);
    return json({ tags, existingTags });
  } catch {
    return json({ error: 'Failed to parse AI response' }, { status: 500 });
  }
};
