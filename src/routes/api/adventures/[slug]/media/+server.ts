import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';
import type { Adventure } from '$lib/shared/types';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adventure = dbGet('SELECT * FROM adventures WHERE slug = ?', params.slug) as Adventure | undefined;
  if (!adventure) {
    return json({ error: 'Adventure not found' }, { status: 404 });
  }

  if (adventure.author_id !== user.id) {
    return json({ error: 'You can only manage media on your own adventures' }, { status: 403 });
  }

  const body = await request.json();
  const { adventureId, immichAssetId, filePath, caption, mediaType } = body;

  if (!immichAssetId?.trim() && !filePath?.trim()) {
    return json({ error: 'Asset ID or file path is required' }, { status: 400 });
  }

  if (adventureId !== adventure.id) {
    return json({ error: 'Adventure ID mismatch' }, { status: 400 });
  }

  // Get next order index
  const maxOrder = dbGet(
    'SELECT COALESCE(MAX(order_index), -1) as max_idx FROM adventure_media WHERE adventure_id = ?',
    adventure.id
  ) as { max_idx: number } | undefined;
  const nextOrder = (maxOrder?.max_idx ?? -1) + 1;

  const mediaId = generateToken();

  dbRun(`
    INSERT INTO adventure_media (id, adventure_id, immich_asset_id, file_path, media_type, caption, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    mediaId,
    adventure.id,
    immichAssetId?.trim() || null,
    filePath?.trim() || null,
    mediaType || 'photo',
    caption || null,
    nextOrder
  );

  const media = dbGet('SELECT * FROM adventure_media WHERE id = ?', mediaId);

  return json({ media });
};

export const DELETE: RequestHandler = async ({ params, request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adventure = dbGet('SELECT * FROM adventures WHERE slug = ?', params.slug) as Adventure | undefined;
  if (!adventure) {
    return json({ error: 'Adventure not found' }, { status: 404 });
  }

  if (adventure.author_id !== user.id) {
    return json({ error: 'You can only manage media on your own adventures' }, { status: 403 });
  }

  const body = await request.json();
  const { mediaId } = body;

  if (!mediaId) {
    return json({ error: 'Media ID is required' }, { status: 400 });
  }

  dbRun('DELETE FROM adventure_media WHERE id = ? AND adventure_id = ?', mediaId, adventure.id);

  return json({ success: true });
};
