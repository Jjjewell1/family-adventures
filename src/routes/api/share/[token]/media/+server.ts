import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { generateToken, detectMediaType } from '$lib/shared/utils';

// Attaches guest-uploaded files to a shared adventure. Unlike the owner-gated
// media endpoints, this accepts files from any authenticated guest who reached
// this share (i.e. they passed the share passcode via /api/share/join).
export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const share = await dbGet(
    'SELECT * FROM public_shares WHERE share_token = ?',
    params.token
  ) as any;
  if (!share) return json({ error: 'Share link not found' }, { status: 404 });
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return json({ error: 'This share link has expired' }, { status: 410 });
  }

  const body = await request.json();
  const { files } = body as { files: { filePath: string; mediaType?: string; caption?: string }[] };

  if (!files || !Array.isArray(files) || files.length === 0) {
    return json({ error: 'No files provided' }, { status: 400 });
  }

  const maxOrder = await dbGet(
    'SELECT COALESCE(MAX(order_index), -1) as max_idx FROM adventure_media WHERE adventure_id = ?',
    share.adventure_id
  ) as { max_idx: number } | undefined;
  let nextOrder = (maxOrder?.max_idx ?? -1) + 1;

  const results: { id: string; filePath: string; mediaType: string }[] = [];

  for (const file of files) {
    if (!file.filePath?.trim()) continue;
    const mediaId = generateToken();
    const mediaType = file.mediaType || detectMediaType(file.filePath);
    await dbRun(
      `INSERT INTO adventure_media (id, adventure_id, file_path, media_type, caption, order_index)
       VALUES (?, ?, ?, ?, ?, ?)`,
      mediaId, share.adventure_id, file.filePath.trim(), mediaType, file.caption || null, nextOrder++
    );
    results.push({ id: mediaId, filePath: file.filePath, mediaType });
  }

  return json({ media: results });
};
