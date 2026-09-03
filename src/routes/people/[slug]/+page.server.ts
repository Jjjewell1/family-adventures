import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { dbGet, dbAll } from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
  const person = await dbGet(`
    SELECT p.*,
      COUNT(DISTINCT mp.media_id) as photo_count
    FROM people p
    LEFT JOIN media_people mp ON mp.person_id = p.id
    WHERE p.slug = ?
    GROUP BY p.id
  `, params.slug);

  if (!person) {
    throw error(404, 'Person not found');
  }

  const photos = await dbAll(`
    SELECT am.*, a.title as adventure_title, a.slug as adventure_slug
    FROM adventure_media am
    JOIN adventures a ON am.adventure_id = a.id
    JOIN media_people mp ON mp.media_id = am.id
    WHERE mp.person_id = ? AND a.is_draft = 0 AND a.visibility = 'family'
    ORDER BY am.created_at DESC
  `, person.id);

  const adventures = await dbAll(`
    SELECT DISTINCT a.id, a.title, a.slug, a.cover_file_path, a.start_date,
      COUNT(DISTINCT am2.id) as photo_count
    FROM adventures a
    JOIN media_people mp ON mp.person_id = ?
    JOIN adventure_media am2 ON am2.adventure_id = a.id AND am2.id = mp.media_id
    WHERE a.is_draft = 0 AND a.visibility = 'family'
    GROUP BY a.id
    ORDER BY a.start_date DESC
  `, person.id);

  return { person, photos: photos ?? [], adventures: adventures ?? [] };
};
