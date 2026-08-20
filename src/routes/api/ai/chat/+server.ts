import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { isAIEnabled, streamText } from '$lib/server/ai';
import { dbAll, dbGet } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isAIEnabled())) {
    return json({ error: 'AI assistant is not enabled. Enable it in Settings.' }, { status: 503 });
  }

  const { messages } = await request.json() as { messages: { role: string; content: string }[] };

  if (!messages || messages.length === 0) {
    return json({ error: 'No messages provided' }, { status: 400 });
  }

  const adventures = await dbAll(`
    SELECT a.title, a.slug, a.start_date, a.end_date, a.location_name, a.description, a.mood, a.template_type,
           (SELECT COUNT(*) FROM adventure_media am WHERE am.adventure_id = a.id AND am.media_type = 'photo') as photo_count,
           (SELECT COUNT(*) FROM adventure_media am WHERE am.adventure_id = a.id AND am.media_type = 'video') as video_count
    FROM adventures a
    WHERE a.is_draft = 0 AND a.visibility = 'family'
    ORDER BY a.start_date DESC NULLS LAST
    LIMIT 50
  `);

  const people = await dbAll(`SELECT name, photo_count FROM people ORDER BY photo_count DESC LIMIT 30`);

  const bucketItems = await dbAll(`
    SELECT title, category, priority FROM bucket_list WHERE status = 'todo' ORDER BY priority DESC LIMIT 20
  `);

  const totalStats = await dbGet(`
    SELECT 
      (SELECT COUNT(*) FROM adventures WHERE is_draft = 0) as adventures,
      (SELECT COUNT(*) FROM adventure_media WHERE media_type = 'photo') as photos,
      (SELECT COUNT(*) FROM adventure_media WHERE media_type = 'video') as videos,
      (SELECT COUNT(*) FROM people) as people_count
  `);

  const adventureList = adventures.map((a: any) =>
    `- ${a.title} (${a.start_date || 'date unknown'}${a.end_date ? ' to ' + a.end_date : ''}) at ${a.location_name || 'unknown location'} — ${a.photo_count} photos, ${a.video_count} videos${a.mood ? ', mood: ' + a.mood : ''}${a.description ? ': ' + a.description.slice(0, 120) : ''}`
  ).join('\n');

  const peopleList = people.map((p: any) => `- ${p.name} (${p.photo_count} photos)`).join('\n');
  const bucketList = bucketItems.map((b: any) => `- ${b.title} [${b.category || 'general'}] (priority: ${b.priority})`).join('\n');

  const systemPrompt = `You are a friendly, knowledgeable assistant for the Jewell family adventure journal at adventures.jewellcore.com. You know about their trips, photos, people, and bucket list. Be warm, conversational, and helpful — like a knowledgeable family friend.

Current stats: ${totalStats?.adventures || 0} adventures, ${totalStats?.photos || 0} photos, ${totalStats?.videos || 0} videos, ${totalStats?.people_count || 0} people tagged.

Adventures (most recent first):
${adventureList || '(none yet)'}

People tagged in photos:
${peopleList || '(none yet)'}

Bucket list items:
${bucketList || '(empty)'}

Guidelines:
- Answer questions about adventures, photos, people, and locations based on the data above
- If someone asks about a specific adventure, reference the details you have
- You can suggest adventures from the bucket list or recommend creating new ones
- Be concise but warm — this is a family journal, not a corporate app
- If you don't have enough information to answer, say so honestly
- Never make up adventures or details that aren't in the data
- You can suggest visiting pages like /adventures, /gallery, /map, /people, /bucket-list`;

  const lastUserMsg = messages[messages.length - 1];
  const conversationHistory = messages.slice(0, -1).map(m =>
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');

  const fullPrompt = conversationHistory
    ? `Previous conversation:\n${conversationHistory}\n\nUser: ${lastUserMsg.content}`
    : lastUserMsg.content;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = streamText({
          prompt: fullPrompt,
          system: systemPrompt,
          temperature: 0.7,
          num_predict: 1024
        });

        for await (const chunk of gen) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Stream failed';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};
