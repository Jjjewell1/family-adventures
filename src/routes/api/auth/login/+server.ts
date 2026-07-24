import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setSessionCookie, loginWithPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await request.json();
  const { email, password } = body;

  if (!email?.trim() || !password?.trim()) {
    return json({ message: 'Email and password are required' }, { status: 400 });
  }

  const user = await loginWithPassword(email.trim(), password);
  
  if (!user) {
    return json({ message: 'Invalid email or password' }, { status: 401 });
  }

  setSessionCookie(cookies, user.id);

  return json({ success: true });
};
