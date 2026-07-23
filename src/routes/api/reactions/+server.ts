import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { adventureId, emoji } = body;

  if (!adventureId || !emoji) {
    return json({ error: 'Adventure ID and emoji are required' }, { status: 400 });
  }

  // Check if reaction already exists
  const existing = dbGet(
    'SELECT id FROM reactions WHERE adventure_id = ? AND author_id = ? AND emoji = ?',
    adventureId, user.id, emoji
  );

  if (existing) {
    // Remove reaction (toggle)
    dbRun('DELETE FROM reactions WHERE id = ?', (existing as any).id);
    return json({ removed: true });
  }

  const id = generateToken();

  dbRun(`
    INSERT INTO reactions (id, adventure_id, author_id, emoji)
    VALUES (?, ?, ?, ?)
  `, id, adventureId, user.id, emoji);

  // Add to activity feed
  dbRun(`
    INSERT INTO activity_feed (id, user_id, adventure_id, action_type, metadata)
    VALUES (?, ?, ?, 'reacted', ?)
  `, generateToken(), user.id, adventureId, JSON.stringify({ emoji }));

  return json({ id });
};
