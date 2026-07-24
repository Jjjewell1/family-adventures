import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response('Google sign-in not configured', { status: 500 });
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const scope = 'openid email profile';
  const state = crypto.randomUUID();

  cookies.set('google_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&prompt=select_account`;

  throw redirect(302, authUrl);
};
