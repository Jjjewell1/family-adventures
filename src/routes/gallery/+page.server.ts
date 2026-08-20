import type { PageServerLoad } from './$types';
import { dbAll } from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
  const category = url.searchParams.get('category') || 'all';
  const type = url.searchParams.get('type') || 'all';

  let query = `
    SELECT
      am.*,
      a.title as adventure_title,
      a.slug as adventure_slug,
      GROUP_CONCAT(DISTINCT p.name) as tagged_people
    FROM adventure_media am
    JOIN adventures a ON am.adventure_id = a.id
    LEFT JOIN media_people mp ON mp.media_id = am.id
    LEFT JOIN people p ON mp.person_id = p.id
    WHERE a.is_draft = 0 AND a.visibility = 'family'
  `;

  const params: any[] = [];

  if (type !== 'all') {
    query += ` AND am.media_type = ?`;
    params.push(type);
  }

  if (category !== 'all') {
    query += ` AND am.category = ?`;
    params.push(category);
  }

  query += ` GROUP BY am.id ORDER BY am.created_at DESC`;

  const media = await dbAll(query, ...params);

  return { media, currentCategory: category, currentType: type };
};
