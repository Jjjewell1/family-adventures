import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbGet, dbRun } from '$lib/server/db';
import { analyzeImage, hasVisionSupport, isAIEnabled } from '$lib/server/ai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from '$env/dynamic/private';

const UPLOAD_DIR = env.UPLOAD_DIR || './data/uploads';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { mediaId, filePath } = body;

  if (!mediaId || !filePath) {
    return json({ error: 'mediaId and filePath required' }, { status: 400 });
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

  const filename = filePath.replace('/uploads/', '');
  const fullPath = join(UPLOAD_DIR, filename);

  try {
    const buffer = readFileSync(fullPath);
    const base64 = buffer.toString('base64');

    const analysis = await analyzeImage(base64);

    if (analysis) {
      await dbRun(
        'UPDATE adventure_media SET ai_caption = ?, category = ?, ai_tags = ? WHERE id = ?',
        analysis.caption,
        analysis.category,
        JSON.stringify(analysis.tags),
        mediaId
      );
      return json({ analysis });
    }

    return json({ analysis: null, error: 'AI returned no usable result — check server logs' }, { status: 502 });
  } catch (e) {
    const code = e instanceof Error ? (e as { code?: string }).code : undefined;
    return json({ error: code === 'ENOENT' ? 'Photo file not found on server' : 'Failed to read file' }, { status: 404 });
  }
};
