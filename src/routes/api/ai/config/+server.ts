import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { getAIConfig, setAIConfig, testConnection, type Provider } from '$lib/server/ai';

export const GET: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const config = await getAIConfig();
  const connection = config.enabled ? await testConnection() : { ok: false, models: [], error: 'AI disabled' };
  return json({ config, connection });
};

export const PUT: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const provider: Provider | undefined =
    body.provider === 'gemini' || body.provider === 'ollama' ? body.provider : undefined;

  await setAIConfig({
    enabled: body.enabled,
    provider,
    url: body.url?.trim() || undefined,
    model: body.model?.trim() || undefined
  });

  return json({ success: true });
};