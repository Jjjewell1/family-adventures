import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser, hashPassword, verifyPassword } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { oldPassword, newPassword } = body;

  if (!oldPassword || !newPassword) {
    return json({ error: 'Current and new password are required' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const fullUser = dbGet('SELECT password_hash FROM users WHERE id = ?', user.id) as { password_hash: string } | undefined;
  if (!fullUser?.password_hash) {
    return json({ error: 'No password set for this account' }, { status: 400 });
  }

  if (!verifyPassword(oldPassword, fullUser.password_hash)) {
    return json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const newHash = hashPassword(newPassword);
  dbRun('UPDATE users SET password_hash = ? WHERE id = ?', newHash, user.id);

  return json({ success: true });
};
