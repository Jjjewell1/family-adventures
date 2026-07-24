import type { PageServerLoad } from './$types';
import { dbGet, dbAll } from '$lib/server/db';
import type { Adventure } from '$lib/shared/types';

export const load: PageServerLoad = async () => {
  const recentAdventures = await dbAll(`
    SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
    FROM adventures a
    JOIN users u ON a.author_id = u.id
    WHERE a.is_draft = 0 AND a.visibility = 'family'
    ORDER BY a.start_date DESC NULLS LAST, a.created_at DESC
    LIMIT 6
  `) as (Adventure & { author_name: string; author_avatar: string | null })[];

  const heroImages = await dbAll(`
    SELECT am.file_path, am.immich_asset_id, a.title as adventure_title, a.slug
    FROM adventure_media am
    JOIN adventures a ON am.adventure_id = a.id
    WHERE a.is_draft = 0 AND a.visibility = 'family' AND am.media_type = 'photo'
    ORDER BY RANDOM()
    LIMIT 12
  `) as { file_path: string | null; immich_asset_id: string | null; adventure_title: string; slug: string }[];

  const stats = await dbGet(`
    SELECT 
      COUNT(*) as total_adventures,
      COUNT(DISTINCT author_id) as total_contributors
    FROM adventures 
    WHERE is_draft = 0
  `) as { total_adventures: number; total_contributors: number };

  return {
    recentAdventures,
    heroImages,
    stats
  };
};
