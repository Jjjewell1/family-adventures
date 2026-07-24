import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const itemId = url.searchParams.get('itemId');
  if (!itemId) return json({ error: 'Missing itemId' }, { status: 400 });

  const comments = await dbAll(
    `SELECT blc.*, u.name as author_name, u.avatar_url as author_avatar
     FROM bucket_list_comments blc
     JOIN users u ON blc.author_id = u.id
     WHERE blc.bucket_item_id = ?
     ORDER BY blc.created_at DESC`,
    itemId
  );

  return json(comments);
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { bucketItemId, content } = await request.json();
  if (!bucketItemId || !content?.trim()) {
    return json({ error: 'Content is required' }, { status: 400 });
  }

  const id = generateToken();
  await dbRun(
    'INSERT INTO bucket_list_comments (id, bucket_item_id, author_id, content) VALUES (?, ?, ?, ?)',
    id, bucketItemId, user.id, content.trim()
  );

  return json({ id }, { status: 201 });
};
