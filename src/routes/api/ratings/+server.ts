import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { adventureId, score, label } = await request.json();
  if (!adventureId || !score || score < 1 || score > 5) {
    return json({ error: 'Invalid rating' }, { status: 400 });
  }

  const id = generateToken();
  await dbRun(
    `INSERT INTO ratings (id, adventure_id, author_id, score, label)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(adventure_id, author_id) DO UPDATE SET score = excluded.score, label = excluded.label`,
    id, adventureId, user.id, score, label || null
  );

  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { adventureId } = await request.json();
  await dbRun('DELETE FROM ratings WHERE adventure_id = ? AND author_id = ?', adventureId, user.id);
  return json({ success: true });
};
