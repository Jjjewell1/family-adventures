import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser, requireAdmin } from '$lib/server/auth';
import { runFaceRecognitionBackfill, getFaceRecognitionStats } from '$lib/server/face-recognition';

export const POST: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  await requireAdmin(user);

  try {
    const result = await runFaceRecognitionBackfill();
    return json({ success: true, ...result });
  } catch (e) {
    console.error('[face-recognition] backfill failed:', e);
    return json({ error: e instanceof Error ? e.message : 'Face recognition failed' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  await requireAdmin(user);

  try {
    const stats = await getFaceRecognitionStats();
    return json({ success: true, stats });
  } catch (e) {
    console.error('[face-recognition] stats failed:', e);
    return json({ error: e instanceof Error ? e.message : 'Failed to get stats' }, { status: 500 });
  }
};