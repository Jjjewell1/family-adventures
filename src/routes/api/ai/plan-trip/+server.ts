import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const { destination, tripDuration, familySize, templateType, extraNotes } = await request.json();

  if (!destination?.trim()) return json({ error: 'Destination is required' }, { status: 400 });

  const system = `You are a family trip planning assistant. 
Create a practical, fun itinerary for a family trip. Include daily activities, restaurant suggestions, packing tips, and kid-friendly notes.
Return a JSON object with: itinerary (array of {day, title, activities: string[]}), packingList (string[]), tips (string[]), estimatedBudget (string).
Be specific and practical. Assume a family with children.`;

  const prompt = `Plan a family trip:
Destination: ${destination}
Duration: ${tripDuration || '3-5 days'}
Family size: ${familySize || 'family of 4'}
Trip type: ${templateType || 'general'}
${extraNotes ? `Notes: ${extraNotes}` : ''}

Create a detailed trip plan with itinerary, packing list, tips, and budget estimate.
Return as JSON: {"itinerary": [{"day": 1, "title": "...", "activities": ["..."]}], "packingList": ["..."], "tips": ["..."], "estimatedBudget": "..."}`;

  const result = await generateText({ prompt, system, temperature: 0.7, num_predict: 2048, format: 'json' });

  if (!result) return json({ error: 'Failed to generate trip plan' }, { status: 500 });

  try {
    const plan = JSON.parse(result);
    return json({ plan });
  } catch {
    return json({ error: 'Failed to parse AI response' }, { status: 500 });
  }
};
