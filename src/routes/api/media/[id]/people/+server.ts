import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const GET: RequestHandler = async ({ params }) => {
  const people = await dbAll(`
    SELECT mp.*, p.name as person_name, p.slug as person_slug, p.avatar_file_path as person_avatar
    FROM media_people mp
    JOIN people p ON mp.person_id = p.id
    WHERE mp.media_id = ?
    ORDER BY p.name ASC
  `, params.id);

  return json({ people });
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { personId, personName, faceX, faceY, faceWidth, faceHeight } = body;

  let resolvedPersonId = personId;

  if (!resolvedPersonId && personName?.trim()) {
    const slug = personName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await dbGet('SELECT id FROM people WHERE slug = ?', slug);
    if (existing) {
      resolvedPersonId = existing.id;
    } else {
      resolvedPersonId = generateToken();
      await dbRun(
        'INSERT INTO people (id, name, slug) VALUES (?, ?, ?)',
        resolvedPersonId, personName.trim(), slug
      );
    }
  }

  if (!resolvedPersonId) {
    return json({ error: 'personId or personName required' }, { status: 400 });
  }

  const existing = await dbGet(
    'SELECT id FROM media_people WHERE media_id = ? AND person_id = ?',
    params.id, resolvedPersonId
  );
  if (existing) {
    return json({ error: 'Already tagged' }, { status: 409 });
  }

  const id = generateToken();
  await dbRun(
    `INSERT INTO media_people (id, media_id, person_id, face_x, face_y, face_width, face_height, tagged_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'user')`,
    id, params.id, resolvedPersonId,
    faceX ?? null, faceY ?? null, faceWidth ?? null, faceHeight ?? null
  );

  const person = await dbGet('SELECT * FROM people WHERE id = ?', resolvedPersonId);
  return json({ tag: { id, person } }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { personId } = body;

  if (!personId) return json({ error: 'personId required' }, { status: 400 });

  await dbRun('DELETE FROM media_people WHERE media_id = ? AND person_id = ?', params.id, personId);
  return json({ success: true });
};
