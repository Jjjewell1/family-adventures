import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { proxyAsset } from '$lib/server/immich';

export const GET: RequestHandler = async ({ params, url }) => {
  const { id } = params;
  const isThumbnail = url.searchParams.get('thumbnail') === '1';

  const result = await proxyAsset(id, isThumbnail);
  
  if (!result) {
    error(404, 'Asset not found');
  }

  return new Response(result.buffer, {
    headers: {
      'content-type': result.contentType,
      'cache-control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
