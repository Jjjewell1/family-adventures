import { env } from '$env/dynamic/private';
import { dbRun, dbGet } from './db';
import type { User } from '$lib/shared/types';
import { generateToken } from '$lib/shared/utils';
import { createHmac, randomBytes } from 'crypto';

const SESSION_SECRET = env.SESSION_SECRET || 'change-this-to-a-random-string';
const SESSION_COOKIE = 'family_adventures_session';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac('sha256', SESSION_SECRET)
    .update(password + salt)
    .digest('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verifyHash = createHmac('sha256', SESSION_SECRET)
    .update(password + salt)
    .digest('hex');
  return hash === verifyHash;
}

export function createSessionToken(userId: string): string {
  const payload = { userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const data = JSON.stringify(payload);
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('hex');
  return Buffer.from(data).toString('base64') + '.' + signature;
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;

    const data = Buffer.from(dataB64, 'base64').toString();
    const expectedSig = createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('hex');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) return null;

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function setSessionCookie(cookies: any, userId: string) {
  const token = createSessionToken(userId);
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60
  });
}

export async function getSessionUser(cookies: any): Promise<User | null> {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await dbGet('SELECT * FROM users WHERE id = ?', session.userId) as User | undefined;
  return user || null;
}

export async function loginWithPassword(email: string, password: string): Promise<User | null> {
  const user = await dbGet('SELECT * FROM users WHERE email = ?', email) as User | undefined;
  if (!user) return null;
  if (!user.password_hash) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}

export async function createUser(email: string, name: string, password: string, role: string = 'member'): Promise<User> {
  const userId = generateToken();
  const passwordHash = hashPassword(password);
  const username = email.split('@')[0];

  await dbRun(`
    INSERT INTO users (id, username, email, name, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `, userId, username, email, name, passwordHash, role);

  return await dbGet('SELECT * FROM users WHERE id = ?', userId) as User;
}

export async function hasUsers(): Promise<boolean> {
  const result = await dbGet('SELECT COUNT(*) as count FROM users') as { count: number } | undefined;
  return (result?.count ?? 0) > 0;
}

export function logout(cookies: any) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function requireAuth(cookies: any): Promise<User> {
  const user = await getSessionUser(cookies);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(cookies: any): Promise<User> {
  const user = await requireAuth(cookies);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}
