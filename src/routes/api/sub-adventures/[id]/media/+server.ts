import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request, cookies, params }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await dbGet('SELECT id FROM sub_adventures WHERE id = ?', params.id);
  if (!sub) return json({ error: 'Sub-adventure not found' }, { status: 404 });

  const body = await request.json();
  const { filePath, immichAssetId, caption } = body;

  if (!filePath && !immichAssetId) {
    return json({ error: 'File path or Immich asset ID is required' }, { status: 400 });
  }

  const maxOrder = await dbGet(
    'SELECT COALESCE(MAX(order_index), -1) + 1 as next FROM sub_adventure_media WHERE sub_adventure_id = ?',
    params.id
  ) as { next: number };

  const id = generateToken();
  await dbRun(
    'INSERT INTO sub_adventure_media (id, sub_adventure_id, file_path, immich_asset_id, caption, order_index) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    params.id,
    filePath || null,
    immichAssetId || null,
    caption?.trim() || null,
    maxOrder.next
  );

  const media = await dbGet('SELECT * FROM sub_adventure_media WHERE id = ?', id);
  return json(media, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, cookies, params }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { mediaId } = body;

  if (!mediaId) return json({ error: 'Media ID is required' }, { status: 400 });

  const media = await dbGet('SELECT * FROM sub_adventure_media WHERE id = ? AND sub_adventure_id = ?', mediaId, params.id);
  if (!media) return json({ error: 'Media not found' }, { status: 404 });

  await dbRun('DELETE FROM sub_adventure_media WHERE id = ?', mediaId);
  return json({ success: true });
};
