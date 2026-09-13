import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbAll, dbGet, dbRun } from '$lib/server/db';

const MOVE_KEY = 'FA-MOVE-202609-a79c4e';

export const GET: RequestHandler = async () => {
  const adventures = await dbAll<{ id: string; title: string; slug: string; media_count: number }>(`
    SELECT a.id, a.title, a.slug,
      COALESCE((SELECT COUNT(*) FROM adventure_media m WHERE m.adventure_id = a.id), 0) AS media_count
    FROM adventures a
    ORDER BY a.created_at ASC
  `);
  return json({ adventures });
};

export const POST: RequestHandler = async ({ request }) => {
  if (request.headers.get('x-move-key') !== MOVE_KEY) {
    return json({ error: 'forbidden' }, { status: 403 });
  }
  const { fromId, toId } = await request.json();
  if (!fromId || !toId) return json({ error: 'fromId and toId required' }, { status: 400 });
  if (fromId === toId) return json({ error: 'fromId and toId must differ' }, { status: 400 });

  const source = await dbGet('SELECT id FROM adventures WHERE id = ?', fromId);
  const target = await dbGet('SELECT id FROM adventures WHERE id = ?', toId);
  if (!source || !target) return json({ error: 'adventure not found' }, { status: 404 });

  const count = await dbGet<{ c: number }>('SELECT COUNT(*) AS c FROM adventure_media WHERE adventure_id = ?', fromId);
  await dbRun('UPDATE adventure_media SET adventure_id = ? WHERE adventure_id = ?', toId, fromId);
  return json({ moved: count?.c ?? 0 });
};