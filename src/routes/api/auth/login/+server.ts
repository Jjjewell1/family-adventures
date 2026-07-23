import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setSessionCookie, loginWithImmichApiKey } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await request.json();
  const { apiKey } = body;

  if (!apiKey?.trim()) {
    return json({ message: 'API key is required' }, { status: 400 });
  }

  const user = await loginWithImmichApiKey(apiKey.trim());
  
  if (!user) {
    return json({ message: 'Invalid API key or Immich server unreachable' }, { status: 401 });
  }

  setSessionCookie(cookies, user.id);

  return json({ success: true });
};
