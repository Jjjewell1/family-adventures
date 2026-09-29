import type { PageServerLoad } from './$types';
import { dbAll } from '$lib/server/db';
import { getSessionUser } from '$lib/server/auth';
import type { Adventure, Tag } from '$lib/shared/types';

export const load: PageServerLoad = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  // Keep the complete accessible library so clearing a deep-linked filter restores it.
  const rows = await dbAll(`
    SELECT a.*, u.name as author_name, u.avatar_url as author_avatar,
      (SELECT file_path FROM adventure_media WHERE adventure_id = a.id AND media_type = 'photo'
       ORDER BY hero_image DESC, order_index LIMIT 1) AS cover_file_path
    FROM adventures a JOIN users u ON a.author_id = u.id
    WHERE ${user ? '(a.is_draft = 0 OR a.author_id = ?)' : 'a.is_draft = 0'}
      AND a.visibility = 'family'
    ORDER BY a.start_date DESC NULLS LAST, a.created_at DESC
  `, ...(user ? [user.id] : [])) as (Adventure & { author_name: string; author_avatar: string | null })[];
  const tags = await dbAll('SELECT * FROM tags ORDER BY name') as Tag[];
  const links = await dbAll('SELECT adventure_id, tag_id FROM adventure_tags') as {adventure_id: string; tag_id: string}[];
  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  const adventureTags = new Map<string, Tag[]>();
  for (const link of links) {
    const tag = tagMap.get(link.tag_id);
    if (tag) adventureTags.set(link.adventure_id, [...(adventureTags.get(link.adventure_id) || []), tag]);
  }
  return {
    adventures: rows.map(row => ({ ...row, tags: adventureTags.get(row.id) || [] })),
    tags,
    initialTag: url.searchParams.get('tag'),
    initialYear: Number(url.searchParams.get('year')) || null
  };
};
