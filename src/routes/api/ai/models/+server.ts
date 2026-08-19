import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { getAIConfig } from '$lib/server/ai';

export const GET: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const config = await getAIConfig();
  if (!config.enabled) return json({ models: [] });

  try {
    const res = await fetch(`${config.url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return json({ models: [], error: `HTTP ${res.status}` });
    const data = await res.json();
    const models = (data.models || []).map((m: { name: string }) => m.name);
    return json({ models });
  } catch {
    return json({ models: [], error: 'Could not reach Ollama' });
  }
};
