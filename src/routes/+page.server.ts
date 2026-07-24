import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    const { dbGet, dbAll } = await import('$lib/server/db');

    const recentAdventures = await dbAll(`
      SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
      FROM adventures a
      JOIN users u ON a.author_id = u.id
      WHERE a.is_draft = 0 AND a.visibility = 'family'
      ORDER BY a.start_date DESC NULLS LAST, a.created_at DESC
      LIMIT 6
    `);

    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total_adventures,
        COUNT(DISTINCT author_id) as total_contributors
      FROM adventures 
      WHERE is_draft = 0
    `);

    return {
      recentAdventures,
      stats
    };
  } catch (e: any) {
    console.error('Home page load error:', e?.message ?? e ?? 'unknown');
    return { recentAdventures: [], stats: { total_adventures: 0, total_contributors: 0 } };
  }
};
