import { env } from '$env/dynamic/private';
import { getConfig } from './db';

const ENV_OLLAMA_URL = env.OLLAMA_URL?.trim().replace(/\/$/, '') || 'http://100.116.226.10:11434';
// Must be a vision-capable model — text-only models reject image analysis requests
const ENV_OLLAMA_MODEL = env.OLLAMA_MODEL?.trim() || 'qwen3.5:9b';
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

// Checks whether the configured model can actually process images.
// Text-only models reject every photo analysis with HTTP 400.
export async function hasVisionSupport(): Promise<{ ok: boolean; model: string; error?: string }> {
  const url = await getOllamaUrl();
  const model = await getOllamaModel();
  try {
    const response = await fetch(`${url}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return { ok: false, model, error: `Model "${model}" not found on the Ollama server` };
    const data = await response.json();
    const capabilities: string[] = data.capabilities || [];
    if (!capabilities.includes('vision')) {
      return {
        ok: false,
        model,
        error: `Model "${model}" cannot see images. Open Settings → AI and pick a vision model (e.g. qwen3.5:9b)`
      };
    }
    return { ok: true, model };
  } catch (e) {
    return { ok: false, model, error: e instanceof Error ? e.message : 'Could not reach Ollama' };
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

export interface VisionAnalysis {
  caption: string;
  category: string;
  tags: string[];
  people_count: number;
}

export async function generateVision(imageBase64: string, prompt: string, system?: string): Promise<string | null> {
  if (!(await isAIEnabled())) return null;

  const url = await getOllamaUrl();
  const model = await getOllamaModel();

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        {
          role: 'user',
          content: prompt,
          images: [imageBase64]
        }
      ],
      stream: false,
      think: false,
      options: {
        temperature: 0.3,
        num_predict: 512
      }
    };

    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });

    if (!response.ok) {
      // Surface why it failed (e.g. model lacks vision support) instead of failing silently
      const errText = await response.text().catch(() => '');
      console.error(`[ai] vision request failed (${model}): HTTP ${response.status} ${errText.slice(0, 300)}`);
      return null;
    }
    const data = await response.json();
    return data.message?.content || data.message?.thinking || null;
  } catch (e) {
    console.error('[ai] vision request error:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function analyzeImage(imageBase64: string): Promise<VisionAnalysis | null> {
  const raw = await generateVision(
    imageBase64,
    `Analyze this photo from a family vacation or celebration. Return ONLY valid JSON with these fields:
- "caption": A brief, warm caption for this photo (1 sentence, family-journal tone)
- "category": Exactly one of "beach", "hiking", "landmark", "celebration", "food", "wildlife", "group", "selfie", "other"
  (beach = beach/pool/lake days, hiking = trails/mountains/nature walks, landmark = sightseeing/monuments/cities,
   celebration = birthdays/holidays/parties/gatherings, food = meals/treats/dining out,
   wildlife = animals/zoo/aquarium, group = multiple family members together, selfie = self-portrait style)
- "tags": Array of 2-6 short lowercase tags describing the moment, focused on family travel and celebrations
  (e.g. ["beach day", "sandcastles", "sunset"], ["birthday party", "cake", "balloons"], ["road trip", "mountain view"], ["fireworks", "4th of july"])
- "people_count": Number of people visible (0 if none)

No explanation. Just the JSON object.`,
    'You are a photo analyst for a family adventure journal. You catalog vacations, days out, and celebrations. Be warm and descriptive.'
  );

  if (!raw) return null;

  try {
    // Models sometimes wrap JSON in prose or code fences — extract the first {...} block
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const VALID_CATEGORIES = ['beach', 'hiking', 'landmark', 'celebration', 'food', 'wildlife', 'group', 'selfie', 'other'];
    const category = String(parsed.category || '').toLowerCase().trim();
    return {
      caption: parsed.caption || '',
      category: VALID_CATEGORIES.includes(category) ? category : 'other',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t: unknown) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 6)
        : [],
      people_count: typeof parsed.people_count === 'number' ? parsed.people_count : 0
    };
  } catch {
    return null;
  }
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
      think: false,
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
    return data.message?.content || data.message?.thinking || null;
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
      think: false,
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
          } else if (parsed.message?.thinking) {
            yield parsed.message.thinking;
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
