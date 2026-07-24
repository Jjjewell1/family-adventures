import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getSessionUser, hashPassword, verifyPassword } from '$lib/server/auth';
import { dbRun, dbGet, dbAll } from '$lib/server/db';
import { generateToken } from '$lib/shared/utils';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) throw redirect(302, '/auth/login');

  const users = await dbAll('SELECT id, username, email, name, role, approved, provider, avatar_url, created_at FROM users ORDER BY approved ASC, created_at ASC');

  return {
    user,
    users,
    immichConfigured: !!(env.IMMICH_API_URL && env.IMMICH_API_KEY),
    immichUrl: env.IMMICH_API_URL ? 'Set' : 'Not set',
    immichKey: env.IMMICH_API_KEY ? 'Set' : 'Not set'
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, cookies }) => {
    const user = await getSessionUser(cookies);
    if (!user) return fail(401, { error: 'Unauthorized' });

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();

    if (!name || !email) return fail(400, { error: 'Name and email are required' });

    const existingEmail = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', email, user.id);
    if (existingEmail) return fail(400, { error: 'Email is already in use' });

    await dbRun('UPDATE users SET name = ?, email = ? WHERE id = ?', name, email, user.id);

    return { success: true, message: 'Profile updated' };
  },

  changePassword: async ({ request, cookies }) => {
    const user = await getSessionUser(cookies);
    if (!user) return fail(401, { error: 'Unauthorized' });

    const formData = await request.formData();
    const oldPassword = formData.get('oldPassword')?.toString();
    const newPassword = formData.get('newPassword')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    if (!oldPassword || !newPassword) return fail(400, { error: 'All password fields are required' });
    if (newPassword !== confirmPassword) return fail(400, { error: 'New passwords do not match' });
    if (newPassword.length < 6) return fail(400, { error: 'Password must be at least 6 characters' });

    const fullUser = await dbGet('SELECT * FROM users WHERE id = ?', user.id) as { password_hash: string } | undefined;
    if (!fullUser?.password_hash) return fail(400, { error: 'No password set for this account' });

    if (!verifyPassword(oldPassword, fullUser.password_hash)) {
      return fail(400, { error: 'Current password is incorrect' });
    }

    const newHash = hashPassword(newPassword);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', newHash, user.id);

    return { success: true, message: 'Password changed' };
  },

  addMember: async ({ request, cookies }) => {
    const user = await getSessionUser(cookies);
    if (!user || user.role !== 'admin') return fail(403, { error: 'Forbidden' });

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();
    const role = formData.get('role')?.toString() || 'member';

    if (!name || !email || !password) return fail(400, { error: 'Name, email, and password are required' });
    if (password.length < 6) return fail(400, { error: 'Password must be at least 6 characters' });

    const existing = await dbGet('SELECT id FROM users WHERE email = ?', email);
    if (existing) return fail(400, { error: 'A user with this email already exists' });

    const userId = generateToken();
    const passwordHash = hashPassword(password);
    let username = email.split('@')[0];

    const existingUsername = await dbGet('SELECT id FROM users WHERE username = ?', username);
    if (existingUsername) {
      username = username + '_' + generateToken(4);
    }

    await dbRun(
      'INSERT INTO users (id, username, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      userId, username, email, name, passwordHash, role === 'admin' ? 'admin' : 'member'
    );

    return { success: true, message: 'Member added' };
  },

  deleteMember: async ({ request, cookies }) => {
    const user = await getSessionUser(cookies);
    if (!user || user.role !== 'admin') return fail(403, { error: 'Forbidden' });

    const formData = await request.formData();
    const targetId = formData.get('userId')?.toString();

    if (!targetId) return fail(400, { error: 'User ID is required' });
    if (targetId === user.id) return fail(400, { error: 'You cannot delete yourself' });

    const targetUser = await dbGet('SELECT id FROM users WHERE id = ?', targetId);
    if (!targetUser) return fail(404, { error: 'User not found' });

    await dbRun('DELETE FROM comments WHERE author_id = ?', targetId);
    await dbRun('DELETE FROM reactions WHERE author_id = ?', targetId);
    await dbRun('DELETE FROM bucket_list_votes WHERE user_id = ?', targetId);
    await dbRun('DELETE FROM bucket_list_comments WHERE author_id = ?', targetId);
    await dbRun('DELETE FROM ratings WHERE author_id = ?', targetId);
    await dbRun('DELETE FROM adventure_stories WHERE author_id = ?', targetId);
    await dbRun('DELETE FROM activity_feed WHERE user_id = ?', targetId);
    await dbRun('UPDATE adventures SET author_id = ? WHERE author_id = ?', user.id, targetId);
    await dbRun('UPDATE bucket_list SET created_by = ? WHERE created_by = ?', user.id, targetId);
    await dbRun('DELETE FROM users WHERE id = ?', targetId);

    return { success: true, message: 'Member deleted' };
  }
};
