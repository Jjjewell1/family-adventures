import type { LayoutServerLoad } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { getConfig } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const user = await getSessionUser(cookies);

  const siteTitle = await getConfig('site_title') || 'Family Adventures';
  const siteDescription = await getConfig('site_description') || "Our family's collection of adventures, memories, and shared moments";
  const logoFilename = await getConfig('logo_filename');

  // Build logo URL — if we have an uploaded logo, use it with cache-busting;
  // otherwise fall back to the static /logo.png
  const logoUrl = logoFilename
    ? `/uploads/${logoFilename}?v=${Date.now()}`
    : '/logo.png';
  const faviconUrl = logoFilename
    ? `/uploads/${logoFilename.replace('logo-', 'favicon-').replace('/branding/', '/branding/')}?v=${Date.now()}`
    : '/favicon.png';
  const ogImageUrl = logoFilename
    ? `/uploads/${logoFilename.replace('logo-', 'og-').replace('/branding/', '/branding/')}?v=${Date.now()}`
    : '/og-image.png';

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
      logoUrl,
      faviconUrl,
      ogImageUrl
    },
    siteUrl: url.origin
  };
};
