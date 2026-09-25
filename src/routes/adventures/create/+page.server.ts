import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { dbAll } from '$lib/server/db';
import { getSessionUser } from '$lib/server/auth';
import type { Tag } from '$lib/shared/types';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = await getSessionUser(cookies);

  if (!user) {
    redirect(302, '/auth/login');
  }

  const tags = await dbAll('SELECT * FROM tags ORDER BY name') as Tag[];

  return {
    tags
  };
};

export const actions: Actions = {
  // Receives the PWA share_target POST (declared in vite.config.ts). The share
  // sheet hands us whatever the sender provided, so each field has to be
  // length-capped before it reaches the form — an unbounded title would blow out
  // the layout and land in the database as-is.
  default: async ({ request, cookies }) => {
    const user = await getSessionUser(cookies);
    if (!user) redirect(302, '/auth/login');

    const form = await request.formData();
    const clamp = (value: FormDataEntryValue | null, max: number) =>
      typeof value === 'string' ? value.trim().slice(0, max) : '';

    const title = clamp(form.get('title'), 200);
    const text = clamp(form.get('text'), 500);
    const url = clamp(form.get('url'), 2000);

    return {
      shared: {
        title,
        description: [text, url].filter(Boolean).join('\n\n')
      }
    };
  }
};
