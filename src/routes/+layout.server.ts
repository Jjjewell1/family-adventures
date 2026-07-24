import type { LayoutServerLoad } from './$types';
import { getSessionUser } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  
  return {
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    } : null
  };
};
