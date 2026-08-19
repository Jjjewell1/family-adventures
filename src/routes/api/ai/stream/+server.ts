import { streamText, isAIEnabled } from '$lib/server/ai';
import { getSessionUser } from '$lib/server/auth';

export const POST = async ({ request, cookies }: { request: Request; cookies: any }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  if (!(await isAIEnabled())) return new Response(JSON.stringify({ error: 'AI not enabled' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const { prompt, system } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamText({ prompt, system, temperature: 0.8, num_predict: 1024 })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`));
      }
      controller.close();
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
