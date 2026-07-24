import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbGet, dbRun } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';
import { generateToken } from '$lib/shared/utils';

export const POST: RequestHandler = async ({ request }) => {
  const { name, email, password } = await request.json();

  if (!name?.trim() || !email?.trim() || !password) {
    return json({ message: 'All fields are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // Check if email already exists
  const existing = await dbGet('SELECT id FROM users WHERE email = ?', email.trim());
  if (existing) {
    return json({ message: 'An account with this email already exists' }, { status: 409 });
  }

  const userId = generateToken();
  const passwordHash = hashPassword(password);
  const username = email.trim().split('@')[0];

  await dbRun(
    `INSERT INTO users (id, username, email, name, password_hash, provider, approved)
     VALUES (?, ?, ?, ?, ?, 'local', 0)`,
    userId, username, email.trim(), name.trim(), passwordHash
  );

  return json({ success: true });
};
