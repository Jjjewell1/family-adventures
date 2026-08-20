import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbAll, dbRun } from '$lib/server/db';
import { detectMediaType } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || user.role !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }

  const media = await dbAll<{ id: string; file_path: string; media_type: string }>(
    'SELECT id, file_path, media_type FROM adventure_media'
  );

  let fixed = 0;
  const changes: { id: string; oldType: string; newType: string; filePath: string }[] = [];

  for (const m of media) {
    const correctType = detectMediaType(m.file_path);
    if (correctType !== m.media_type) {
      await dbRun('UPDATE adventure_media SET media_type = ? WHERE id = ?', correctType, m.id);
      changes.push({ id: m.id, oldType: m.media_type, newType: correctType, filePath: m.file_path });
      fixed++;
    }
  }

  const subMedia = await dbAll<{ id: string; file_path: string; media_type: string }>(
    'SELECT id, file_path, media_type FROM sub_adventure_media WHERE media_type IS NOT NULL'
  );

  for (const m of subMedia) {
    const correctType = detectMediaType(m.file_path);
    if (correctType !== m.media_type) {
      await dbRun('UPDATE sub_adventure_media SET media_type = ? WHERE id = ?', correctType, m.id);
      changes.push({ id: m.id, oldType: m.media_type, newType: correctType, filePath: m.file_path });
      fixed++;
    }
  }

  return json({ fixed, changes, total: media.length + subMedia.length });
};
