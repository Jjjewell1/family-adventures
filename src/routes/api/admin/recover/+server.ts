import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { dbGet, dbRun } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';

const RECOVERY_KEY = env.ADMIN_RECOVERY_KEY;

export const POST: RequestHandler = async ({ request }) => {
  if (!RECOVERY_KEY) {
    return json({ error: 'Recovery not configured' }, { status: 404 });
  }

  const { recoveryKey, email, password } = await request.json();

  if (recoveryKey !== RECOVERY_KEY) {
    return json({ error: 'Invalid recovery key' }, { status: 403 });
  }

  if (!email?.trim() || !password?.trim()) {
    return json({ error: 'Email and password required' }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const admin = await dbGet('SELECT id FROM users WHERE role = ?', 'admin') as any;
  if (!admin) {
    return json({ error: 'No admin account found' }, { status: 404 });
  }

  const passwordHash = hashPassword(password.trim());
  await dbRun(
    'UPDATE users SET email = ?, password_hash = ? WHERE id = ?',
    email.trim().toLowerCase(), passwordHash, admin.id
  );

  return json({ success: true, message: `Admin account updated to ${email.trim().toLowerCase()}` });
};
