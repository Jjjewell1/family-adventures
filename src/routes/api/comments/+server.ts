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
  const { adventureId, content, parentId } = body;

  if (!adventureId || !content?.trim()) {
    return json({ error: 'Adventure ID and content are required' }, { status: 400 });
  }

  // Check adventure exists
  const adventure = dbGet('SELECT id FROM adventures WHERE id = ?', adventureId);
  if (!adventure) {
    return json({ error: 'Adventure not found' }, { status: 404 });
  }

  const id = generateToken();

  dbRun(`
    INSERT INTO comments (id, adventure_id, author_id, parent_id, content)
    VALUES (?, ?, ?, ?, ?)
  `, id, adventureId, user.id, parentId || null, content.trim());

  // Add to activity feed
  dbRun(`
    INSERT INTO activity_feed (id, user_id, adventure_id, action_type, metadata)
    VALUES (?, ?, ?, 'commented', ?)
  `, generateToken(), user.id, adventureId, JSON.stringify({ commentId: id }));

  return json({ id });
};
