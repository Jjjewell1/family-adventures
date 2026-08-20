import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';
import type { Adventure } from '$lib/shared/types';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const adventure = await dbGet('SELECT * FROM adventures WHERE slug = ?', params.slug) as Adventure | undefined;
  if (!adventure) return json({ error: 'Adventure not found' }, { status: 404 });

  if (adventure.author_id !== user.id) {
    return json({ error: 'You can only add media to your own adventures' }, { status: 403 });
  }

  const body = await request.json();
  const { files } = body as { files: { filePath: string; mediaType: string; caption?: string }[] };

  if (!files || !Array.isArray(files) || files.length === 0) {
    return json({ error: 'No files provided' }, { status: 400 });
  }

  const maxOrder = await dbGet(
    'SELECT COALESCE(MAX(order_index), -1) as max_idx FROM adventure_media WHERE adventure_id = ?',
    adventure.id
  ) as { max_idx: number } | undefined;
  let nextOrder = (maxOrder?.max_idx ?? -1) + 1;

  const results: { id: string; filePath: string; mediaType: string }[] = [];

  for (const file of files) {
    if (!file.filePath?.trim()) continue;
    const mediaId = generateToken();
    await dbRun(
      `INSERT INTO adventure_media (id, adventure_id, file_path, media_type, caption, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
      mediaId, adventure.id, file.filePath.trim(), file.mediaType || 'photo', file.caption || null, nextOrder++
    );
    results.push({ id: mediaId, filePath: file.filePath, mediaType: file.mediaType || 'photo' });
  }

  await dbRun(
    'INSERT INTO activity_feed (id, user_id, adventure_id, action_type, metadata) VALUES (?, ?, ?, ?, ?)',
    generateToken(), user.id, adventure.id, 'uploaded_photo', JSON.stringify({ count: results.length })
  );

  return json({ media: results });
};

export const DELETE: RequestHandler = async ({ params, request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const adventure = await dbGet('SELECT * FROM adventures WHERE slug = ?', params.slug) as Adventure | undefined;
  if (!adventure) return json({ error: 'Adventure not found' }, { status: 404 });

  if (adventure.author_id !== user.id) {
    return json({ error: 'You can only manage media on your own adventures' }, { status: 403 });
  }

  const body = await request.json();
  const { mediaIds } = body as { mediaIds: string[] };

  if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
    return json({ error: 'No media IDs provided' }, { status: 400 });
  }

  const placeholders = mediaIds.map(() => '?').join(',');
  await dbRun(`DELETE FROM adventure_media WHERE id IN (${placeholders}) AND adventure_id = ?`, ...mediaIds, adventure.id);

  return json({ success: true });
};
