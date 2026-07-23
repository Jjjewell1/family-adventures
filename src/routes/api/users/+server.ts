import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser, hashPassword } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';

export const GET: RequestHandler = async ({ cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

  const users = dbAll('SELECT id, username, email, name, role, created_at FROM users ORDER BY created_at ASC');
  return json(users);
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { name, email, password, role } = body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return json({ error: 'Name, email, and password are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const existing = dbGet('SELECT id FROM users WHERE email = ?', email.trim());
  if (existing) {
    return json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const userId = generateToken();
  const passwordHash = hashPassword(password);
  const username = email.trim().split('@')[0];

  dbRun(
    'INSERT INTO users (id, username, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
    userId, username, email.trim(), name.trim(), passwordHash, role === 'admin' ? 'admin' : 'member'
  );

  const created = dbGet('SELECT id, username, email, name, role, created_at FROM users WHERE id = ?', userId);
  return json(created, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id } = body;

  if (!id) return json({ error: 'User ID is required' }, { status: 400 });
  if (id === user.id) return json({ error: 'Cannot delete yourself' }, { status: 400 });

  const target = dbGet('SELECT id FROM users WHERE id = ?', id);
  if (!target) return json({ error: 'User not found' }, { status: 404 });

  dbRun('DELETE FROM comments WHERE author_id = ?', id);
  dbRun('DELETE FROM reactions WHERE author_id = ?', id);
  dbRun('UPDATE adventures SET author_id = ? WHERE author_id = ?', user.id, id);
  dbRun('DELETE FROM users WHERE id = ?', id);

  return json({ success: true });
};
