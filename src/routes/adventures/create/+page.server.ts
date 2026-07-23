import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { dbAll } from '$lib/server/db';
import { getSessionUser } from '$lib/server/auth';
import type { Tag } from '$lib/shared/types';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = getSessionUser(cookies);
  
  if (!user) {
    redirect(302, '/auth/login');
  }

  const tags = dbAll('SELECT * FROM tags ORDER BY name') as Tag[];

  return {
    tags
  };
};
