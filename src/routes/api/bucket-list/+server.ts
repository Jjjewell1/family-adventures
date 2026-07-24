import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, description, locationName, lat, lng, category, status } = body;

  if (!title?.trim()) return json({ error: 'Title is required' }, { status: 400 });

  const id = generateToken();
  await dbRun(
    `INSERT INTO bucket_list (id, title, description, location_name, lat, lng, category, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, title.trim(), description || null, locationName || null,
    lat || null, lng || null, category || 'destination', status || 'wishlist', user.id
  );

  const item = await dbGet('SELECT * FROM bucket_list WHERE id = ?', id);
  return json(item, { status: 201 });
};
