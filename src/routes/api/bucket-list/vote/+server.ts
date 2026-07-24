import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { bucketItemId, vote } = await request.json();
  if (!bucketItemId || typeof vote !== 'number') {
    return json({ error: 'Invalid request' }, { status: 400 });
  }

  // Upsert vote
  await dbRun(
    `INSERT INTO bucket_list_votes (bucket_item_id, user_id, vote)
     VALUES (?, ?, ?)
     ON CONFLICT(bucket_item_id, user_id) DO UPDATE SET vote = excluded.vote`,
    bucketItemId, user.id, vote > 0 ? 1 : -1
  );

  return json({ success: true });
};
