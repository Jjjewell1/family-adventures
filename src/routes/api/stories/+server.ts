import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const GET: RequestHandler = async ({ url }) => {
  const adventureId = url.searchParams.get('adventureId');
  if (!adventureId) return json({ error: 'Missing adventureId' }, { status: 400 });

  const stories = await dbAll(
    `SELECT s.*, u.name as author_name, u.avatar_url as author_avatar,
      (SELECT COUNT(*) FROM story_comments sc WHERE sc.story_id = s.id) as comment_count
     FROM adventure_stories s
     JOIN users u ON s.author_id = u.id
     WHERE s.adventure_id = ?
     ORDER BY s.created_at DESC`,
    adventureId
  );

  return json(stories);
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { adventureId, title, content } = await request.json();
  if (!adventureId || !content?.trim()) {
    return json({ error: 'Content is required' }, { status: 400 });
  }

  const id = generateToken();
  await dbRun(
    'INSERT INTO adventure_stories (id, adventure_id, author_id, title, content) VALUES (?, ?, ?, ?, ?)',
    id, adventureId, user.id, title?.trim() || null, content.trim()
  );

  const story = await dbGet(
    `SELECT s.*, u.name as author_name, u.avatar_url as author_avatar
     FROM adventure_stories s JOIN users u ON s.author_id = u.id WHERE s.id = ?`,
    id
  );

  return json(story, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { storyId } = await request.json();
  const story = await dbGet('SELECT * FROM adventure_stories WHERE id = ?', storyId) as any;
  if (!story) return json({ error: 'Not found' }, { status: 404 });
  if (story.author_id !== user.id && user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbRun('DELETE FROM adventure_stories WHERE id = ?', storyId);
  return json({ success: true });
};
