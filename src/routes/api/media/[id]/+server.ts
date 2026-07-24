import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ request, cookies, params }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const media = await dbGet('SELECT * FROM adventure_media WHERE id = ?', params.id);
  if (!media) return json({ error: 'Media not found' }, { status: 404 });

  const body = await request.json();
  const { hero_image } = body;

  if (hero_image !== undefined) {
    await dbRun('UPDATE adventure_media SET hero_image = ? WHERE id = ?', hero_image ? 1 : 0, params.id);
  }

  const updated = await dbGet('SELECT * FROM adventure_media WHERE id = ?', params.id);
  return json(updated);
};
