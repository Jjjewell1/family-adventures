import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { generateText, isAIEnabled } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAIEnabled())) return json({ error: 'AI is not enabled' }, { status: 400 });

  const { title, description, content, locationName, startDate, endDate, mood, templateType, sideQuests, extraNotes } = await request.json();

  const system = `You are a family member writing a personal story about a family adventure. 
Write in first person, warm and nostalgic tone. Include sensory details, emotions, and specific moments that made this trip special. 
Make it feel like a cherished memory being shared. 3-5 paragraphs. 
Do not use headers or markdown. Plain text only.`;

  const sideQuestContext = sideQuests?.length
    ? `\nSide quests during this trip:\n${sideQuests.map((sq: { title: string; note?: string }) => `- ${sq.title}${sq.note ? ': ' + sq.note : ''}`).join('\n')}`
    : '';

  const prompt = `Write a personal story about this family adventure:
${title ? `Trip name: ${title}` : ''}
${locationName ? `Where we went: ${locationName}` : ''}
${startDate ? `When: ${startDate}` : ''}${endDate ? ` to ${endDate}` : ''}
${mood ? `How it felt: ${mood}` : ''}
${templateType ? `Type of trip: ${templateType}` : ''}
${description ? `What it was about: ${description}` : ''}
${content ? `Our notes: ${content}` : ''}
${sideQuestContext}
${extraNotes ? `Extra details: ${extraNotes}` : ''}

Write a heartfelt family story about this adventure. Be creative and imagine what a wonderful family trip would have been like.`;

  const result = await generateText({ prompt, system, temperature: 0.8, num_predict: 1024 });

  if (!result) return json({ error: 'Failed to generate story' }, { status: 500 });
  return json({ result: result.trim() });
};
