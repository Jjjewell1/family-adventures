import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser, findOrCreateGuestUser, verifyPassword, setSessionCookie, logout } from '$lib/server/auth';
import { dbGet } from '$lib/server/db';

// Joins a shared adventure as a guest contributor.
// Family provide the passcode (set by the adventure owner) plus the display
// name they want contributions attributed to. On success we establish a normal
// session for a lightweight guest user, so the existing upload/comment/story
// endpoints work for them unchanged.
export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await request.json();
  const { token, name, passcode } = body;

  if (!token || !name?.trim() || !passcode?.trim()) {
    return json({ error: 'Your name and passcode are required' }, { status: 400 });
  }

  const share = await dbGet(
    'SELECT * FROM public_shares WHERE share_token = ?',
    token
  ) as any;

  if (!share) {
    return json({ error: 'Share link not found' }, { status: 404 });
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return json({ error: 'This share link has expired' }, { status: 410 });
  }

  // Passcode protects contributions. If the owner didn't set one, treat the
  // link itself as the credential (lenient for single-family shares).
  if (share.password_hash) {
    if (!verifyPassword(String(passcode), share.password_hash)) {
      return json({ error: 'That passcode is incorrect' }, { status: 403 });
    }
  }

  const user = await findOrCreateGuestUser(name);
  setSessionCookie(cookies, user.id);

  return json({
    user: { id: user.id, name: user.name, role: user.role }
  });
};

// Ends the current session (sign out from the share page).
export const DELETE: RequestHandler = async ({ cookies }) => {
  await getSessionUser(cookies); // no-op, just to keep signature
  logout(cookies);
  return json({ success: true });
};
