import type { PageServerLoad } from './$types';
import { dbAll } from '$lib/server/db';

export const load: PageServerLoad = async () => {
  const media = dbAll(`
    SELECT 
      am.*,
      a.title as adventure_title,
      a.slug as adventure_slug
    FROM adventure_media am
    JOIN adventures a ON am.adventure_id = a.id
    WHERE a.is_draft = 0 AND a.visibility = 'family'
    ORDER BY am.created_at DESC
  `);

  return {
    media
  };
};
