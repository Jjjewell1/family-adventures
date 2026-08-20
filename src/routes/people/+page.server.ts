import type { PageServerLoad } from './$types';
import { dbAll } from '$lib/server/db';

export const load: PageServerLoad = async () => {
  const people = await dbAll(`
    SELECT p.*,
      COUNT(DISTINCT mp.media_id) as photo_count
    FROM people p
    LEFT JOIN media_people mp ON mp.person_id = p.id
    GROUP BY p.id
    ORDER BY photo_count DESC, p.name ASC
  `);

  return { people };
};
