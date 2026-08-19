import { env } from '$env/dynamic/private';
import { getConfig } from './db';

const ENV_OLLAMA_URL = env.OLLAMA_URL?.trim().replace(/\/$/, '') || 'http://100.116.226.10:11434';
const ENV_OLLAMA_MODEL = env.OLLAMA_MODEL?.trim() || 'llama3.1';
const ENV_AI_ENABLED = env.AI_ENABLED?.trim().toLowerCase();

async function getOllamaUrl(): Promise<string> {
  const dbUrl = await getConfig('ai_ollama_url');
  return dbUrl || ENV_OLLAMA_URL;
}

async function getOllamaModel(): Promise<string> {
  const dbModel = await getConfig('ai_model');
  return dbModel || ENV_OLLAMA_MODEL;
}

export async function isAIEnabled(): Promise<boolean> {
  const dbEnabled = await getConfig('ai_enabled');
  if (dbEnabled !== null) return dbEnabled === 'true';
  if (ENV_AI_ENABLED !== undefined) return ENV_AI_ENABLED === 'true';
  return true;
}

export async function getAIConfig(): Promise<{ enabled: boolean; url: string; model: string }> {
  return {
    enabled: await isAIEnabled(),
    url: await getOllamaUrl(),
    model: await getOllamaModel()
  };
}

export async function setAIConfig(settings: { enabled?: boolean; url?: string; model?: string }): Promise<void> {
  const { setConfig } = await import('./db');
  if (settings.enabled !== undefined) await setConfig('ai_enabled', String(settings.enabled));
  if (settings.url !== undefined) await setConfig('ai_ollama_url', settings.url);
  if (settings.model !== undefined) await setConfig('ai_model', settings.model);
}

export async function testConnection(): Promise<{ ok: boolean; models: string[]; error?: string }> {
  const url = await getOllamaUrl();
  try {
    const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { ok: false, models: [], error: `HTTP ${response.status}` };
    const data = await response.json();
    const models = (data.models || []).map((m: { name: string }) => m.name);
    return { ok: true, models };
  } catch (e) {
    return { ok: false, models: [], error: e instanceof Error ? e.message : 'Connection failed' };
  }
}

export interface GenerateOptions {
  prompt: string;
  system?: string;
  temperature?: number;
  top_p?: number;
  num_predict?: number;
  format?: 'json';
}

export async function generateText(options: GenerateOptions): Promise<string | null> {
  if (!(await isAIEnabled())) return null;

  const url = await getOllamaUrl();
  const model = await getOllamaModel();

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: options.prompt }
      ],
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        num_predict: options.num_predict ?? 1024
      }
    };

    if (options.format) body.format = options.format;

    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000)
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function* streamText(options: GenerateOptions): AsyncGenerator<string, void, unknown> {
  if (!(await isAIEnabled())) return;

  const url = await getOllamaUrl();
  const model = await getOllamaModel();

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: options.prompt }
      ],
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        num_predict: options.num_predict ?? 1024
      }
    };

    if (options.format) body.format = options.format;

    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) return;
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            yield parsed.message.content;
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  } catch {
    // stream failed silently
  }
}
