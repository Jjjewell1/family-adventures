import type { PageServerLoad } from './$types';
import { dbGet, dbAll } from '$lib/server/db';
import type { Adventure } from '$lib/shared/types';

export const load: PageServerLoad = async () => {
  const recentAdventures = dbAll(`
    SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
    FROM adventures a
    JOIN users u ON a.author_id = u.id
    WHERE a.is_draft = 0 AND a.visibility = 'family'
    ORDER BY a.start_date DESC NULLS LAST, a.created_at DESC
    LIMIT 6
  `) as (Adventure & { author_name: string; author_avatar: string | null })[];

  const stats = dbGet(`
    SELECT 
      COUNT(*) as total_adventures,
      COUNT(DISTINCT author_id) as total_contributors
    FROM adventures 
    WHERE is_draft = 0
  `) as { total_adventures: number; total_contributors: number };

  return {
    recentAdventures,
    stats
  };
};
