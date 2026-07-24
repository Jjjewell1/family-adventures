import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { status, title, description } = body;

  const item = await dbGet('SELECT * FROM bucket_list WHERE id = ?', params.id) as any;
  if (!item) return json({ error: 'Not found' }, { status: 404 });

  if (user.role !== 'admin' && item.created_by !== user.id) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  if (status) {
    await dbRun('UPDATE bucket_list SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', status, params.id);
  }
  if (title !== undefined) {
    await dbRun('UPDATE bucket_list SET title = ?, updated_at = datetime(\'now\') WHERE id = ?', title.trim(), params.id);
  }
  if (description !== undefined) {
    await dbRun('UPDATE bucket_list SET description = ?, updated_at = datetime(\'now\') WHERE id = ?', description || null, params.id);
  }

  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const item = await dbGet('SELECT * FROM bucket_list WHERE id = ?', params.id) as any;
  if (!item) return json({ error: 'Not found' }, { status: 404 });

  if (user.role !== 'admin' && item.created_by !== user.id) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbRun('DELETE FROM bucket_list WHERE id = ?', params.id);
  return json({ success: true });
};
