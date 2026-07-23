import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { adventureId } = body;

  if (!adventureId) {
    return json({ error: 'Adventure ID is required' }, { status: 400 });
  }

  // Check adventure exists and user owns it
  const adventure = await dbGet('SELECT id, author_id FROM adventures WHERE id = ?', adventureId) as any;
  if (!adventure) {
    return json({ error: 'Adventure not found' }, { status: 404 });
  }

  if (adventure.author_id !== user.id) {
    return json({ error: 'Unauthorized' }, { status: 403 });
  }

  const token = generateToken();
  const id = generateToken();

  await dbRun(`
    INSERT INTO public_shares (id, adventure_id, share_token)
    VALUES (?, ?, ?)
  `, id, adventureId, token);

  return json({ token });
};

export const GET: RequestHandler = async ({ url }) => {
  const token = url.searchParams.get('token');
  
  if (!token) {
    return json({ error: 'Token is required' }, { status: 400 });
  }

  const share = await dbGet(`
    SELECT ps.*, a.title, a.slug, a.description, a.cover_asset_id
    FROM public_shares ps
    JOIN adventures a ON ps.adventure_id = a.id
    WHERE ps.share_token = ?
  `, token) as any;

  if (!share) {
    return json({ error: 'Share not found' }, { status: 404 });
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return json({ error: 'Share link has expired' }, { status: 410 });
  }

  return json({
    adventure: {
      title: share.title,
      slug: share.slug,
      description: share.description,
      cover_asset_id: share.cover_asset_id
    },
    allowDownload: share.allow_download
  });
};
