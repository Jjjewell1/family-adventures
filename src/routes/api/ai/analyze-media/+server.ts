import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbGet } from '$lib/server/db';
import { analyzeMediaRow, hasVisionSupport, isAIEnabled } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { mediaId } = body;

  if (!mediaId) {
    return json({ error: 'mediaId is required' }, { status: 400 });
  }

  const media = await dbGet('SELECT * FROM adventure_media WHERE id = ?', mediaId);
  if (!media) return json({ error: 'Media not found' }, { status: 404 });

  if (media.media_type === 'video') {
    return json({ error: 'Videos are skipped — AI analysis works on photos only' }, { status: 400 });
  }

  if (!(await isAIEnabled())) {
    return json({ error: 'AI is disabled. Enable it in Settings → AI' }, { status: 400 });
  }

  // Fail fast with an actionable message when the model can't see images
  const vision = await hasVisionSupport();
  if (!vision.ok) {
    return json({ error: vision.error || 'The AI model cannot analyze images' }, { status: 400 });
  }

  const analysis = await analyzeMediaRow(mediaId);
  if (!analysis) {
    return json({ analysis: null, error: 'AI returned no usable result — check server logs' }, { status: 502 });
  }

  return json({ analysis });
};