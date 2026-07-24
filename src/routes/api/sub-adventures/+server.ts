import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { adventureId, title, dayNumber, note, rating } = body;

  if (!adventureId || !title?.trim()) {
    return json({ error: 'Adventure ID and title are required' }, { status: 400 });
  }

  const adventure = await dbGet('SELECT id FROM adventures WHERE id = ?', adventureId);
  if (!adventure) return json({ error: 'Adventure not found' }, { status: 404 });

  const maxOrder = await dbGet(
    'SELECT COALESCE(MAX(order_index), -1) + 1 as next FROM sub_adventures WHERE adventure_id = ?',
    adventureId
  ) as { next: number };

  const id = generateToken();
  await dbRun(
    'INSERT INTO sub_adventures (id, adventure_id, title, day_number, note, rating, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    adventureId,
    title.trim(),
    dayNumber ?? null,
    note?.trim() || null,
    rating ?? null,
    maxOrder.next
  );

  const sub = await dbGet('SELECT * FROM sub_adventures WHERE id = ?', id);
  return json(sub, { status: 201 });
};
