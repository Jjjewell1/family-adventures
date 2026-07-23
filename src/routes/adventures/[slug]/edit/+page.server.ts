import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { dbGet, dbAll } from '$lib/server/db';
import { getSessionUser } from '$lib/server/auth';
import type { Adventure, Tag, AdventureMedia } from '$lib/shared/types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const user = getSessionUser(cookies);

  if (!user) {
    redirect(302, '/auth/login');
  }

  const adventure = dbGet(`
    SELECT a.*
    FROM adventures a
    WHERE a.slug = ?
  `, params.slug) as Adventure | undefined;

  if (!adventure) {
    error(404, 'Adventure not found');
  }

  if (adventure.author_id !== user.id) {
    error(403, 'You can only edit your own adventures');
  }

  const tags = dbAll('SELECT * FROM tags ORDER BY name') as Tag[];

  const adventureTags = dbAll(`
    SELECT tag_id FROM adventure_tags WHERE adventure_id = ?
  `, adventure.id) as { tag_id: string }[];

  const media = dbAll(`
    SELECT * FROM adventure_media
    WHERE adventure_id = ?
    ORDER BY order_index
  `, adventure.id) as AdventureMedia[];

  return {
    adventure: {
      ...adventure,
      selectedTags: adventureTags.map(t => t.tag_id),
      media
    },
    tags
  };
};
