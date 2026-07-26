import type { LayoutServerLoad } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { getConfig } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const user = await getSessionUser(cookies);

  // Load site config for OG tags
  const siteTitle = await getConfig('site_title') || 'Family Adventures';
  const siteDescription = await getConfig('site_description') || "Our family's collection of adventures, memories, and shared moments";
  const logoFilename = await getConfig('logo_filename') || 'logo.png';

  return {
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      avatar_url: user.avatar_url
    } : null,
    site: {
      title: siteTitle,
      description: siteDescription,
      logoFilename,
      ogImageUrl: `/og-image.png`
    },
    siteUrl: url.origin
  };
};
