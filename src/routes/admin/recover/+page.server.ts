import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
  return {
    isConfigured: !!env.ADMIN_RECOVERY_KEY
  };
};
