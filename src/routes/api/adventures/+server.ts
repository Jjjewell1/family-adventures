import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { slugify, generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
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

  const id = generateToken();
  let slug = slugify(title);

  // Ensure unique slug
  const existing = dbGet('SELECT id FROM adventures WHERE slug = ?', slug);
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  dbRun(`
    INSERT INTO adventures (id, author_id, title, slug, description, location_name, lat, lng, start_date, end_date, mood, template_type, visibility, is_draft)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    id,
    user.id,
    title.trim(),
    slug,
    description || null,
    locationName || null,
    lat || null,
    lng || null,
    startDate || null,
    endDate || null,
    mood || null,
    templateType || null,
    visibility || 'family',
    isDraft ? 1 : 0
  );

  // Add tags
  if (tags && tags.length > 0) {
    for (const tagId of tags) {
      dbRun('INSERT OR IGNORE INTO adventure_tags (adventure_id, tag_id) VALUES (?, ?)', id, tagId);
    }
  }

  // Add to activity feed
  dbRun(`
    INSERT INTO activity_feed (id, user_id, adventure_id, action_type, metadata)
    VALUES (?, ?, ?, 'created_adventure', ?)
  `, generateToken(), user.id, id, JSON.stringify({ title }));

  return json({ id, slug });
};
