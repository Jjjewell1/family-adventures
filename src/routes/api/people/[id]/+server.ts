import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
  const person = await dbGet(`
    SELECT p.*,
      COUNT(DISTINCT mp.media_id) as photo_count
    FROM people p
    LEFT JOIN media_people mp ON mp.person_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `, params.id);

  if (!person) return json({ error: 'Not found' }, { status: 404 });

  const photos = await dbAll(`
    SELECT am.*, a.title as adventure_title, a.slug as adventure_slug
    FROM adventure_media am
    JOIN adventures a ON am.adventure_id = a.id
    JOIN media_people mp ON mp.media_id = am.id
    WHERE mp.person_id = ? AND a.is_draft = 0 AND a.visibility = 'family'
    ORDER BY am.created_at DESC
  `, params.id);

  return json({ person, photos });
};

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, avatarFilePath } = body;

  const person = await dbGet('SELECT * FROM people WHERE id = ?', params.id);
  if (!person) return json({ error: 'Not found' }, { status: 404 });

  if (name !== undefined) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await dbGet('SELECT id FROM people WHERE slug = ? AND id != ?', slug, params.id);
    if (existing) return json({ error: 'A person with that name already exists' }, { status: 409 });
    await dbRun('UPDATE people SET name = ?, slug = ? WHERE id = ?', name.trim(), slug, params.id);
  }

  if (avatarFilePath !== undefined) {
    await dbRun('UPDATE people SET avatar_file_path = ? WHERE id = ?', avatarFilePath || null, params.id);
  }

  const updated = await dbGet('SELECT * FROM people WHERE id = ?', params.id);
  return json({ person: updated });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  await dbRun('DELETE FROM media_people WHERE person_id = ?', params.id);
  await dbRun('DELETE FROM people WHERE id = ?', params.id);

  return json({ success: true });
};
