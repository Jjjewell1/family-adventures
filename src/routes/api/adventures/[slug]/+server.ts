import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { slugify } from '$lib/shared/utils';
import type { Adventure } from '$lib/shared/types';

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adventure = dbGet('SELECT * FROM adventures WHERE slug = ?', params.slug) as Adventure | undefined;
  if (!adventure) {
    return json({ error: 'Adventure not found' }, { status: 404 });
  }

  if (adventure.author_id !== user.id) {
    return json({ error: 'You can only edit your own adventures' }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    description,
    content,
    locationName,
    lat,
    lng,
    startDate,
    endDate,
    mood,
    templateType,
    visibility,
    isDraft,
    tags
  } = body;

  if (!title?.trim()) {
    return json({ error: 'Title is required' }, { status: 400 });
  }

  let slug = adventure.slug;
  if (title.trim() !== adventure.title) {
    slug = slugify(title);
    const existing = dbGet('SELECT id FROM adventures WHERE slug = ? AND id != ?', slug, adventure.id);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  dbRun(`
    UPDATE adventures
    SET title = ?, slug = ?, description = ?, content = ?, location_name = ?,
        lat = ?, lng = ?, start_date = ?, end_date = ?, mood = ?,
        template_type = ?, visibility = ?, is_draft = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
    title.trim(),
    slug,
    description || null,
    content || null,
    locationName || null,
    lat || null,
    lng || null,
    startDate || null,
    endDate || null,
    mood || null,
    templateType || null,
    visibility || 'family',
    isDraft ? 1 : 0,
    adventure.id
  );

  // Replace tags
  dbRun('DELETE FROM adventure_tags WHERE adventure_id = ?', adventure.id);
  if (tags && tags.length > 0) {
    for (const tagId of tags) {
      dbRun('INSERT OR IGNORE INTO adventure_tags (adventure_id, tag_id) VALUES (?, ?)', adventure.id, tagId);
    }
  }

  return json({ id: adventure.id, slug });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adventure = dbGet('SELECT * FROM adventures WHERE slug = ?', params.slug) as Adventure | undefined;
  if (!adventure) {
    return json({ error: 'Adventure not found' }, { status: 404 });
  }

  if (adventure.author_id !== user.id) {
    return json({ error: 'You can only delete your own adventures' }, { status: 403 });
  }

  // Delete related data (foreign keys with CASCADE should handle most, but be explicit)
  dbRun('DELETE FROM adventure_media WHERE adventure_id = ?', adventure.id);
  dbRun('DELETE FROM adventure_tags WHERE adventure_id = ?', adventure.id);
  dbRun('DELETE FROM comments WHERE adventure_id = ?', adventure.id);
  dbRun('DELETE FROM reactions WHERE adventure_id = ?', adventure.id);
  dbRun('DELETE FROM public_shares WHERE adventure_id = ?', adventure.id);
  dbRun('DELETE FROM activity_feed WHERE adventure_id = ?', adventure.id);
  dbRun('DELETE FROM adventures WHERE id = ?', adventure.id);

  return json({ success: true });
};
