import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const { title, description, locationName, startDate, endDate, mood, templateType, extraNotes } = await request.json();

  const system = `You are a family adventure writer. Write warm, vivid, engaging trip descriptions for a family travel journal. 
Write in a friendly, personal tone as if recounting a cherished family memory. 
Use sensory details and emotional moments. Keep it 2-3 paragraphs. 
Do not use headers or markdown formatting. Write as plain text.`;

  const prompt = `Write a trip description for this adventure:
${title ? `Title: ${title}` : ''}
${locationName ? `Location: ${locationName}` : ''}
${startDate ? `Start date: ${startDate}` : ''}
${endDate ? `End date: ${endDate}` : ''}
${mood ? `Mood: ${mood}` : ''}
${templateType ? `Type: ${templateType}` : ''}
${description ? `Existing notes: ${description}` : ''}
${extraNotes ? `Additional notes: ${extraNotes}` : ''}

Write a compelling adventure description based on this information. Be creative and fill in plausible details for a family adventure.`;

  const result = await generateText({ prompt, system, temperature: 0.8, num_predict: 512 });

  if (!result) return json({ error: 'Failed to generate description' }, { status: 500 });
  return json({ result: result.trim() });
};
