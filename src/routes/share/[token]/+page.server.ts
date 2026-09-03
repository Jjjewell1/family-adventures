import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { dbGet, dbAll } from '$lib/server/db';
import { getSessionUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, url, cookies }) => {
  const share = await dbGet(`
    SELECT ps.*, a.*, u.name as owner_name
    FROM public_shares ps
    JOIN adventures a ON ps.adventure_id = a.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE ps.share_token = ?
  `, params.token) as any;

  if (!share) {
    error(404, 'Share not found');
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    error(410, 'Share link has expired');
  }

  // Media
  const media = await dbAll(`
    SELECT am.*,
      (SELECT GROUP_CONCAT(p.name) FROM media_people mp JOIN people p ON mp.person_id = p.id WHERE mp.media_id = am.id) as tagged_people
    FROM adventure_media am
    WHERE am.adventure_id = ?
    ORDER BY am.order_index
  `, share.adventure_id);

  // Comments (top-level with replies)
  const comments = await dbAll(`
    SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.adventure_id = ? AND c.parent_id IS NULL
    ORDER BY c.created_at DESC
  `, share.adventure_id) as any[];

  const commentsWithReplies = await Promise.all(comments.map(async comment => {
    const replies = await dbAll(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
    `, comment.id);
    return { ...comment, replies };
  }));

  // Stories ("tell your story")
  const stories = await dbAll(`
    SELECT s.*, u.name as author_name, u.avatar_url as author_avatar
    FROM adventure_stories s
    JOIN users u ON s.author_id = u.id
    WHERE s.adventure_id = ?
    ORDER BY s.created_at DESC
  `, share.adventure_id);

  // Current visitor (may be an owner or a guest who already signed in)
  const sessionUser = await getSessionUser(cookies);
  const isContributor = Boolean(sessionUser) && sessionUser!.id !== share.author_id;

  return {
    adventure: {
      ...share,
      media,
      id: share.id,
      hasPasscode: Boolean(share.password_hash)
    },
    comments: commentsWithReplies,
    stories,
    isContributor,
    sessionUser: sessionUser ? {
      id: sessionUser.id,
      name: sessionUser.name,
      role: sessionUser.role
    } : null,
    siteUrl: url.origin
  };
};
