import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbAll } from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) throw redirect(302, '/auth/login');

  const items = await dbAll(`
    SELECT 
      af.*,
      u.name as user_name, u.avatar_url as user_avatar, u.username as user_username,
      a.title as adventure_title, a.slug as adventure_slug,
      tu.name as target_user_name, tu.username as target_user_username,
      am.file_path as media_file_path, am.id as media_id
    FROM activity_feed af
    JOIN users u ON af.user_id = u.id
    LEFT JOIN adventures a ON af.adventure_id = a.id
    LEFT JOIN users tu ON json_extract(af.metadata, '$.target_user_id') = tu.id
    LEFT JOIN adventure_media am ON json_extract(af.metadata, '$.media_id') = am.id
    ORDER BY af.created_at DESC
    LIMIT 30
  `) as any[];

  return { items, user };
};
