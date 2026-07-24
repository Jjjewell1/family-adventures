import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const GET: RequestHandler = async ({ url }) => {
  const storyId = url.searchParams.get('storyId');
  if (!storyId) return json({ error: 'Missing storyId' }, { status: 400 });

  const comments = await dbAll(
    `SELECT sc.*, u.name as author_name, u.avatar_url as author_avatar
     FROM story_comments sc
     JOIN users u ON sc.author_id = u.id
     WHERE sc.story_id = ?
     ORDER BY sc.created_at ASC`,
    storyId
  );

  return json(comments);
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { storyId, content } = await request.json();
  if (!storyId || !content?.trim()) {
    return json({ error: 'Content is required' }, { status: 400 });
  }

  const id = generateToken();
  await dbRun(
    'INSERT INTO story_comments (id, story_id, author_id, content) VALUES (?, ?, ?, ?)',
    id, storyId, user.id, content.trim()
  );

  return json({ id }, { status: 201 });
};
