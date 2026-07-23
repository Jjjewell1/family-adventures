import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { dbGet, dbAll } from '$lib/server/db';
import type { Adventure, Comment, Tag, Reaction } from '$lib/shared/types';

export const load: PageServerLoad = async ({ params, url }) => {
  const adventure = await dbGet(`
    SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
    FROM adventures a
    JOIN users u ON a.author_id = u.id
    WHERE a.slug = ? AND a.is_draft = 0
  `, params.slug) as (Adventure & { author_name: string; author_avatar: string | null }) | undefined;

  if (!adventure) {
    error(404, 'Adventure not found');
  }

  // Get tags
  const tags = await dbAll(`
    SELECT t.*
    FROM tags t
    JOIN adventure_tags at2 ON t.id = at2.tag_id
    WHERE at2.adventure_id = ?
  `, adventure.id) as Tag[];

  // Get media
  const media = await dbAll(`
    SELECT * FROM adventure_media
    WHERE adventure_id = ?
    ORDER BY order_index
  `, adventure.id);

  // Get comments with authors
  const comments = await dbAll(`
    SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.adventure_id = ? AND c.parent_id IS NULL
    ORDER BY c.created_at DESC
  `, adventure.id) as (Comment & { author_name: string; author_avatar: string | null })[];

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(comments.map(async comment => {
    const replies = await dbAll(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
    `, comment.id) as (Comment & { author_name: string; author_avatar: string | null })[];
    
    return {
      ...comment,
      author: { name: comment.author_name, avatar_url: comment.author_avatar },
      replies: replies.map(r => ({
        ...r,
        author: { name: r.author_name, avatar_url: r.author_avatar }
      }))
    };
  }));

  // Get reactions
  const reactions = await dbAll(`
    SELECT r.*, u.name as author_name
    FROM reactions r
    LEFT JOIN users u ON r.author_id = u.id
    WHERE r.adventure_id = ?
  `, adventure.id) as (Reaction & { author_name: string })[];

  return {
    adventure: {
      ...adventure,
      tags,
      media
    },
    comments: commentsWithReplies,
    reactions,
    siteUrl: url.origin
  };
};
