import type { PageServerLoad } from './$types';
import { dbGet, dbAll } from '$lib/server/db';
import { getSessionUser } from '$lib/server/auth';
import type { Adventure, Tag } from '$lib/shared/types';

export const load: PageServerLoad = async ({ url, cookies }) => {
  const tagFilter = url.searchParams.get('tag');
  const yearFilter = url.searchParams.get('year');

  const user = await getSessionUser(cookies);

  let adventures: (Adventure & { tags: Tag[]; author_name: string; author_avatar: string | null })[] = [];

  const draftCondition = user ? `(a.is_draft = 0 OR a.author_id = ?)` : `a.is_draft = 0`;
  const baseParams: any[] = user ? [user.id] : [];

  if (tagFilter || yearFilter) {
    let query = `
      SELECT a.*, u.name as author_name, u.avatar_url as author_avatar,
        GROUP_CONCAT(DISTINCT t.id || ':' || t.name || ':' || t.color) as tags_raw
      FROM adventures a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN adventure_tags at2 ON a.id = at2.adventure_id
      LEFT JOIN tags t ON at2.tag_id = t.id
      WHERE ${draftCondition} AND a.visibility = 'family'
    `;
    const params: any[] = [...baseParams];

    if (tagFilter) {
      query += ` AND t.id = ?`;
      params.push(tagFilter);
    }

    if (yearFilter) {
      query += ` AND strftime('%Y', a.start_date) = ?`;
      params.push(yearFilter);
    }

    query += `
      GROUP BY a.id
      ORDER BY a.start_date DESC NULLS LAST, a.created_at DESC
    `;

    const rows = await dbAll(query, ...params) as any[];
    adventures = rows.map(row => ({
      ...row,
      tags: row.tags_raw ? row.tags_raw.split(',').map((t: string) => {
        const [id, name, color] = t.split(':');
        return { id, name, color };
      }) : []
    }));
  } else {
    const rows = await dbAll(`
      SELECT a.*, u.name as author_name, u.avatar_url as author_avatar,
        GROUP_CONCAT(DISTINCT t.id || ':' || t.name || ':' || t.color) as tags_raw
      FROM adventures a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN adventure_tags at2 ON a.id = at2.adventure_id
      LEFT JOIN tags t ON at2.tag_id = t.id
      WHERE ${draftCondition} AND a.visibility = 'family'
      GROUP BY a.id
      ORDER BY a.start_date DESC NULLS LAST, a.created_at DESC
    `, ...baseParams) as any[];
    
    adventures = rows.map(row => ({
      ...row,
      tags: row.tags_raw ? row.tags_raw.split(',').map((t: string) => {
        const [id, name, color] = t.split(':');
        return { id, name, color };
      }) : []
    }));
  }

  const tags = await dbAll('SELECT * FROM tags ORDER BY name') as Tag[];

  return {
    adventures,
    tags
  };
};
