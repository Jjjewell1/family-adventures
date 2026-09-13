import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { testConnection } from '$lib/server/ai';

export const GET: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const connection = await testConnection();
  return json({ models: connection.ok ? connection.models : [], error: connection.ok ? undefined : connection.error });
};