import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const GET: RequestHandler = async () => {
  const people = await dbAll(`
    SELECT p.*,
      COUNT(DISTINCT mp.media_id) as photo_count
    FROM people p
    LEFT JOIN media_people mp ON mp.person_id = p.id
    GROUP BY p.id
    ORDER BY p.name ASC
  `);
  return json({ people });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, avatarFilePath } = body;

  if (!name?.trim()) {
    return json({ error: 'Name is required' }, { status: 400 });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const existing = await dbGet('SELECT id FROM people WHERE slug = ?', slug);
  if (existing) {
    return json({ error: 'A person with that name already exists' }, { status: 409 });
  }

  const id = generateToken();
  await dbRun(
    'INSERT INTO people (id, name, slug, avatar_file_path) VALUES (?, ?, ?, ?)',
    id, name.trim(), slug, avatarFilePath || null
  );

  const person = await dbGet('SELECT * FROM people WHERE id = ?', id);
  return json({ person }, { status: 201 });
};
