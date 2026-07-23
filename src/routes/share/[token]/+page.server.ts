import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { dbGet, dbAll } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, url }) => {
  const share = dbGet(`
    SELECT ps.*, a.*
    FROM public_shares ps
    JOIN adventures a ON ps.adventure_id = a.id
    WHERE ps.share_token = ?
  `, params.token) as any;

  if (!share) {
    error(404, 'Share not found');
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    error(410, 'Share link has expired');
  }

  // Get media
  const media = dbAll(`
    SELECT * FROM adventure_media
    WHERE adventure_id = ?
    ORDER BY order_index
  `, share.adventure_id);

  return {
    adventure: {
      ...share,
      media
    },
    siteUrl: url.origin
  };
};
