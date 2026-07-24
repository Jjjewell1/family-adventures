import type { PageServerLoad } from './$types';
import { dbAll } from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies }) => {
  const items = await dbAll(`
    SELECT bl.*, u.name as author_name, u.avatar_url as author_avatar,
      COALESCE(SUM(blv.vote), 0) as vote_score,
      (SELECT COUNT(*) FROM bucket_list_comments blc WHERE blc.bucket_item_id = bl.id) as comment_count
    FROM bucket_list bl
    JOIN users u ON bl.created_by = u.id
    LEFT JOIN bucket_list_votes blv ON bl.id = blv.bucket_item_id
    GROUP BY bl.id
    ORDER BY bl.status ASC, vote_score DESC, bl.created_at DESC
  `);

  return { items };
};
