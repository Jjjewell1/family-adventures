import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';
import { dbAll } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const adventures = await dbAll('SELECT title, location_name, template_type FROM adventures WHERE is_draft = 0 ORDER BY start_date DESC LIMIT 20');
  const bucketItems = await dbAll('SELECT title, location_name FROM bucket_list ORDER BY created_at DESC');
  const { extraNotes } = await request.json();

  const system = `You are a bucket list suggestion engine for a family travel journal. 
Based on where the family has been and what they already want to do, suggest new adventures. 
Return a JSON array of objects with: title (string), description (string 1-2 sentences), locationName (string), category (one of: destination, activity, trip, event, other).
Suggest 5 diverse adventures that complement their travel history. Be creative but realistic for a family.`;

  const travelHistory = adventures.length
    ? `Past adventures:\n${adventures.map(a => `- ${a.title} (${a.location_name || 'unknown location'}, ${a.template_type || 'general'})`).join('\n')}`
    : 'No past adventures recorded yet.';

  const existingBucket = bucketItems.length
    ? `\n\nAlready on bucket list:\n${bucketItems.map(b => `- ${b.title} (${b.location_name || 'unknown'})`).join('\n')}`
    : '';

  const prompt = `Suggest 5 new bucket list adventures for this family:

${travelHistory}
${existingBucket}
${extraNotes ? `\nPreferences: ${extraNotes}` : ''}

Return a JSON array like [{"title": "...", "description": "...", "locationName": "...", "category": "destination"}]`;

  const result = await generateText({ prompt, system, temperature: 0.8, num_predict: 1024, format: 'json' });

  if (!result) return json({ error: 'Failed to generate suggestions' }, { status: 500 });

  try {
    const suggestions = JSON.parse(result);
    return json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
  } catch {
    return json({ error: 'Failed to parse AI response' }, { status: 500 });
  }
};
