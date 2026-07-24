import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';

export const PUT: RequestHandler = async ({ request, cookies, params }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await dbGet('SELECT * FROM sub_adventures WHERE id = ?', params.id);
  if (!sub) return json({ error: 'Sub-adventure not found' }, { status: 404 });

  const body = await request.json();
  const { title, dayNumber, note, rating, orderIndex } = body;

  if (title !== undefined) {
    await dbRun('UPDATE sub_adventures SET title = ? WHERE id = ?', title.trim(), params.id);
  }
  if (dayNumber !== undefined) {
    await dbRun('UPDATE sub_adventures SET day_number = ? WHERE id = ?', dayNumber ?? null, params.id);
  }
  if (note !== undefined) {
    await dbRun('UPDATE sub_adventures SET note = ? WHERE id = ?', note?.trim() || null, params.id);
  }
  if (rating !== undefined) {
    await dbRun('UPDATE sub_adventures SET rating = ? WHERE id = ?', rating ?? null, params.id);
  }
  if (orderIndex !== undefined) {
    await dbRun('UPDATE sub_adventures SET order_index = ? WHERE id = ?', orderIndex, params.id);
  }
  await dbRun("UPDATE sub_adventures SET updated_at = datetime('now') WHERE id = ?", params.id);

  const updated = await dbGet('SELECT * FROM sub_adventures WHERE id = ?', params.id);
  return json(updated);
};

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await dbGet('SELECT * FROM sub_adventures WHERE id = ?', params.id);
  if (!sub) return json({ error: 'Sub-adventure not found' }, { status: 404 });

  await dbRun('DELETE FROM sub_adventure_media WHERE sub_adventure_id = ?', params.id);
  await dbRun('DELETE FROM sub_adventures WHERE id = ?', params.id);

  return json({ success: true });
};
