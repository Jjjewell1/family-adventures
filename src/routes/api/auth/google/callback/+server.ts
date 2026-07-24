import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { dbGet, dbRun } from '$lib/server/db';
import { setSessionCookie } from '$lib/server/auth';
import { generateToken } from '$lib/shared/utils';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  if (!code) {
    throw redirect(302, '/auth/login?error=no_code');
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw redirect(302, '/auth/login?error=not_configured');
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${url.origin}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      throw redirect(302, '/auth/login?error=token_exchange_failed');
    }

    const tokens = await tokenRes.json();

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userRes.ok) {
      throw redirect(302, '/auth/login?error=userinfo_failed');
    }

    const googleUser = await userRes.json();

    // Find or create user
    let user = await dbGet(
      'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
      'google', googleUser.id
    ) as any;

    if (!user) {
      // Check if email already exists with local account
      user = await dbGet('SELECT * FROM users WHERE email = ?', googleUser.email) as any;
      if (user) {
        // Link Google account to existing local account
        await dbRun(
          'UPDATE users SET provider = ?, provider_id = ?, avatar_url = ? WHERE id = ?',
          'google', googleUser.id, googleUser.picture || null, user.id
        );
        user.provider = 'google';
        user.provider_id = googleUser.id;
        user.avatar_url = googleUser.picture || null;
      } else {
        // Create new user from Google
        const userId = generateToken();
        const username = googleUser.email.split('@')[0];
        await dbRun(
          `INSERT INTO users (id, username, email, name, avatar_url, provider, provider_id, approved)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          userId, username, googleUser.email, googleUser.name,
          googleUser.picture || null, 'google', googleUser.id
        );
        user = await dbGet('SELECT * FROM users WHERE id = ?', userId) as any;
      }
    } else {
      // Update avatar from Google
      if (googleUser.picture && user.avatar_url !== googleUser.picture) {
        await dbRun('UPDATE users SET avatar_url = ? WHERE id = ?', googleUser.picture, user.id);
        user.avatar_url = googleUser.picture;
      }
    }

    // Check if user is approved
    if (!user.approved) {
      throw redirect(302, '/auth/login?error=pending_approval');
    }

    // Set session and redirect
    setSessionCookie(cookies, user.id);
    throw redirect(302, '/');

  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    throw redirect(302, '/auth/login?error=auth_failed');
  }
};
