import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';

export const PUT: RequestHandler = async ({ request, cookies, params }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const targetId = params.id;
  const isAdmin = user.role === 'admin';
  const isSelf = user.id === targetId;

  if (!isAdmin && !isSelf) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const target = await dbGet('SELECT * FROM users WHERE id = ?', targetId);
  if (!target) return json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { name, email, role } = body;

  if (name !== undefined && name.trim()) {
    await dbRun('UPDATE users SET name = ? WHERE id = ?', name.trim(), targetId);
  }

  if (email !== undefined && email.trim()) {
    const existingEmail = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', email.trim(), targetId);
    if (existingEmail) return json({ error: 'Email is already in use' }, { status: 409 });
    await dbRun('UPDATE users SET email = ? WHERE id = ?', email.trim(), targetId);
  }

  if (role !== undefined && isAdmin) {
    await dbRun('UPDATE users SET role = ? WHERE id = ?', role === 'admin' ? 'admin' : 'member', targetId);
  }

  const updated = await dbGet('SELECT id, username, email, name, role, created_at FROM users WHERE id = ?', targetId);
  return json(updated);
};
