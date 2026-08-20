import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbGet, dbRun } from '$lib/server/db';
import { analyzeImage } from '$lib/server/ai';
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

    return json({ analysis: null, error: 'AI analysis failed' }, { status: 500 });
  } catch (e) {
    return json({ error: 'Failed to read file' }, { status: 404 });
  }
};
