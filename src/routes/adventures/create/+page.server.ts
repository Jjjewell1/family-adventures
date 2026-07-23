import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { dbGet, dbAll } from '$lib/server/db';
import type { Tag } from '$lib/shared/types';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = dbGet('SELECT * FROM users LIMIT 1');
  
  if (!user) {
    redirect(302, '/auth/login');
  }

  const tags = dbAll('SELECT * FROM tags ORDER BY name') as Tag[];

  return {
    tags
  };
};
