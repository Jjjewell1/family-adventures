import { env } from '$env/dynamic/private';
import { getConfig, setConfig, dbGet, dbRun, dbAll } from './db';
import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Provider config
// Two AI backends are supported:
//   - "ollama" (default): local model, private by definition
//   - "gemini": Google Generative Language API (stable + hosted). Requires the
//     GEMINI_API_KEY env var (set in Coolify — never commit it).
// The active provider can be flipped at runtime in Settings → AI (persists in
// site_config) or overridden with the AI_PROVIDER env var.
// ---------------------------------------------------------------------------

const ENV_OLLAMA_URL = env.OLLAMA_URL?.trim().replace(/\/$/, '') || 'http://100.116.226.10:11434';
// Must be a vision-capable model — text-only models reject image analysis requests
const ENV_OLLAMA_MODEL = env.OLLAMA_MODEL?.trim() || 'qwen3.5:9b';
const ENV_AI_ENABLED = env.AI_ENABLED?.trim().toLowerCase();
const GEMINI_API_KEY = env.GEMINI_API_KEY?.trim();
// Current stable default for new keys. Older models (e.g. gemini-2.5-flash)
// still appear in the /models list but 404 on actual generation for new
// accounts, so calls fall back to this default.
const ENV_GEMINI_MODEL = env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type Provider = 'ollama' | 'gemini';

async function getOllamaUrl(): Promise<string> {
  const dbUrl = await getConfig('ai_ollama_url');
  return dbUrl || ENV_OLLAMA_URL;
}

async function getConfiguredModel(): Promise<string | null> {
  return await getConfig('ai_model');
}

// Model resolution that is provider-aware: a model name saved while another
// provider was active (e.g. an ollama name like "qwen3.5:9b") would 404 against
// the Gemini API, so Gemini ignores non-Gemini names and uses its default.
function looksLikeGeminiModel(name: string): boolean {
  return /^(gemini|gemma)/i.test(name);
}

async function resolveModel(provider: Provider): Promise<string> {
  const configured = await getConfiguredModel();
  if (configured) {
    if (provider === 'gemini' && !looksLikeGeminiModel(configured)) return ENV_GEMINI_MODEL;
    return configured;
  }
  return provider === 'gemini' ? ENV_GEMINI_MODEL : ENV_OLLAMA_MODEL;
}

export async function getProvider(): Promise<Provider> {
  const dbProvider = (await getConfig('ai_provider'))?.toLowerCase();
  if (dbProvider === 'gemini' || dbProvider === 'ollama') return dbProvider;
  if (env.AI_PROVIDER?.trim().toLowerCase() === 'gemini') return 'gemini';
  return 'ollama';
}

export async function isAIEnabled(): Promise<boolean> {
  const dbEnabled = await getConfig('ai_enabled');
  if (dbEnabled !== null) return dbEnabled === 'true';
  if (ENV_AI_ENABLED !== undefined) return ENV_AI_ENABLED === 'true';
  return true;
}

export async function getAIConfig(): Promise<{
  enabled: boolean;
  provider: Provider;
  url: string;
  model: string;
  geminiKeySet: boolean;
}> {
  const provider = await getProvider();
  return {
    enabled: await isAIEnabled(),
    provider,
    url: await getOllamaUrl(),
    model: await resolveModel(provider),
    geminiKeySet: !!GEMINI_API_KEY
  };
}

export async function setAIConfig(settings: {
  enabled?: boolean;
  provider?: Provider;
  url?: string;
  model?: string;
}): Promise<void> {
  if (settings.enabled !== undefined) await setConfig('ai_enabled', String(settings.enabled));
  if (settings.provider === 'gemini' || settings.provider === 'ollama') {
    await setConfig('ai_provider', settings.provider);
  }
  if (settings.url !== undefined) await setConfig('ai_ollama_url', settings.url);
  if (settings.model !== undefined) await setConfig('ai_model', settings.model);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

// Maps an upload path to the best-guess image MIME type so Gemini can decode
// inline image data (wrong MIME = rejected request). Videos/images we can't
// handle fall back to image/jpeg.
export function guessImageMime(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif'
  };
  return map[ext] || 'image/jpeg';
}

// ---------------------------------------------------------------------------
// Connection diagnostics
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<{ ok: boolean; models: string[]; error?: string }> {
  if ((await getProvider()) === 'gemini') {
    if (!GEMINI_API_KEY) {
      return { ok: false, models: [], error: 'GEMINI_API_KEY is not set in the Coolify environment' };
    }
    try {
      const res = await fetch(`${GEMINI_BASE}/models?pageSize=200&key=${encodeURIComponent(GEMINI_API_KEY)}`, {
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return { ok: false, models: [], error: `Gemini API HTTP ${res.status}` };
      const data = await res.json();
      const models = (data.models || [])
        .map((m: { name: string }) => m.name.replace(/^models\//, ''))
        .filter((n: string) => /(flash|pro|nano|light)/i.test(n))
        .sort((a: string, b: string) => b.localeCompare(a))
        .slice(0, 60);
      return { ok: true, models };
    } catch (e) {
      return { ok: false, models: [], error: e instanceof Error ? e.message : 'Could not reach Gemini API' };
    }
  }

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

// Checks whether the active provider/model can actually process images.
export async function hasVisionSupport(): Promise<{ ok: boolean; model: string; error?: string }> {
  if ((await getProvider()) === 'gemini') {
    if (!GEMINI_API_KEY) {
      return { ok: false, model: 'gemini', error: 'GEMINI_API_KEY is not set in the Coolify environment' };
    }
    const model = await resolveModel('gemini');
    return { ok: true, model };
  }

  const url = await getOllamaUrl();
  const model = (await getConfiguredModel()) || ENV_OLLAMA_MODEL;
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

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  prompt: string;
  system?: string;
  temperature?: number;
  top_p?: number;
  num_predict?: number;
  format?: 'json';
}

interface GeminiRequest {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

function buildGeminiBody(
  prompt: string,
  system: string | undefined,
  image?: { base64: string; mimeType: string },
  opts: Pick<GenerateOptions, 'temperature' | 'top_p' | 'num_predict' | 'format'> = {}
): GeminiRequest {
  const parts: GeminiRequest['contents'][0]['parts'] = [];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  parts.push({ text: prompt });

  const body: GeminiRequest = { contents: [{ role: 'user', parts }] };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const generationConfig: NonNullable<GeminiRequest['generationConfig']> = {};
  if (opts.temperature !== undefined) generationConfig.temperature = opts.temperature;
  if (opts.top_p !== undefined) generationConfig.topP = opts.top_p;
  if (opts.num_predict !== undefined) generationConfig.maxOutputTokens = opts.num_predict;
  if (opts.format === 'json') generationConfig.responseMimeType = 'application/json';
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;
  return body;
}

async function geminiGenerateOnce(
  body: GeminiRequest,
  model: string,
  apiKey: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000)
    });
    if (!res.ok) {
      let error = `Gemini HTTP ${res.status}`;
      try {
        const errData = await res.json();
        if (errData?.error?.message) error = errData.error.message;
      } catch { /* keep status fallback */ }
      return { ok: false, error };
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string; thought?: boolean }) => (p.thought ? '' : p.text || ''))
      .join('');
    return text ? { ok: true, text } : { ok: false, error: 'Gemini returned an empty response' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gemini request failed' };
  }
}

async function geminiNonStream(body: GeminiRequest, model: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!GEMINI_API_KEY) return { ok: false, error: 'GEMINI_API_KEY is not set' };
  const result = await geminiGenerateOnce(body, model, GEMINI_API_KEY!);
  // Retired/preview models (still in the /models list) 404 for new keys — retry
  // with the provider default once before giving up.
if (!result.ok && model !== ENV_GEMINI_MODEL && /(no longer available|cannot be found|not found)/i.test(result.error || '')) {
      return await geminiGenerateOnce(body, ENV_GEMINI_MODEL, GEMINI_API_KEY!);
    }
  return result;
}

export interface VisionAnalysis {
  caption: string;
  category: string;
  tags: string[];
  people_count: number;
}

export async function generateVision(
  imageBase64: string,
  prompt: string,
  system?: string,
  mimeType: string = 'image/jpeg'
): Promise<string | null> {
  if (!(await isAIEnabled())) return null;

  if ((await getProvider()) === 'gemini') {
    const model = await resolveModel('gemini');
    const { ok, text, error } = await geminiNonStream(
      buildGeminiBody(prompt, system, { base64: imageBase64, mimeType }, { temperature: 0.3, num_predict: 900 }),
      model
    );
    if (!ok) {
      console.error(`[ai] gemini vision request failed: ${error}`);
      return null;
    }
    return text ?? null;
  }

  const url = await getOllamaUrl();
  const model = (await getConfiguredModel()) || ENV_OLLAMA_MODEL;
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
        // Enough headroom that verbose models don't truncate the JSON mid-object
        num_predict: 900
      }
    };

    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });

    if (!response.ok) {
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

export async function analyzeImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysis | null> {
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
    'You are a photo analyst for a family adventure journal. You catalog vacations, days out, and celebrations. Be warm and descriptive.',
    mimeType
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

  if ((await getProvider()) === 'gemini') {
    const model = await resolveModel('gemini');
    const { ok, text } = await geminiNonStream(
      buildGeminiBody(options.prompt, options.system, undefined, {
        temperature: options.temperature,
        top_p: options.top_p,
        num_predict: options.num_predict,
        format: options.format
      }),
      model
    );
    return ok ? text ?? null : null;
  }

  const url = await getOllamaUrl();
  const model = (await getConfiguredModel()) || ENV_OLLAMA_MODEL;

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

  if ((await getProvider()) === 'gemini') {
    if (!GEMINI_API_KEY) return;
    const model = await resolveModel('gemini');
    const attempts = model === ENV_GEMINI_MODEL ? [model] : [model, ENV_GEMINI_MODEL];

    for (const attemptModel of attempts) {
      const url = `${GEMINI_BASE}/models/${attemptModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(GEMINI_API_KEY)}`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            buildGeminiBody(options.prompt, options.system, undefined, {
              temperature: options.temperature,
              top_p: options.top_p,
              num_predict: options.num_predict,
              format: options.format
            })
          ),
          signal: AbortSignal.timeout(120_000)
        });
      } catch {
        console.error('[ai] gemini stream fetch failed');
        return;
      }

      // A configured model the key can no longer use 404s here — retry with the
      // provider default once. But never silently drop a streaming output that
      // already started; a failed response is only visible before any bytes.
      if (!response.ok) {
        if (attemptModel !== ENV_GEMINI_MODEL) {
          console.error(`[ai] gemini stream model ${attemptModel} unavailable (HTTP ${response.status}), falling back to ${ENV_GEMINI_MODEL}`);
          continue;
        }
        console.error(`[ai] gemini stream failed: HTTP ${response.status}`);
        return;
      }
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
          if (!line.startsWith('data:')) continue;
          const json = line.slice(5).trim();
          if (!json || json === '[DONE]') continue;
          try {
            const parsed = JSON.parse(json);
            const text = (parsed.candidates?.[0]?.content?.parts || [])
              .map((p: { text?: string; thought?: boolean }) => (p.thought ? '' : p.text || ''))
              .join('');
            if (text) yield text;
          } catch {
            // skip malformed SSE frames
          }
        }
      }
      return;
    }
    return;
  }

  const url = await getOllamaUrl();
  const model = (await getConfiguredModel()) || ENV_OLLAMA_MODEL;

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

// ---------------------------------------------------------------------------
// Media analysis worker
// A single serialized worker processes queued media IDs (one AI call at a
// time, so batch uploads / backfills don't hammer the provider's rate limits).
// New photo uploads enqueue here; the admin "Categorize all" button seeds it
// with every photo that still has no category.
// ---------------------------------------------------------------------------

const UPLOAD_DIR = env.UPLOAD_DIR || './data/uploads';

const queue: string[] = [];
let workerRunning = false;

export interface JobStats {
  startedAt: number;
  total: number;
  done: number;
  ok: number;
  failed: number;
  skipped: number;
}

let jobStats: JobStats | null = null;

export interface AnalysisStatus {
  running: boolean;
  queued: number;
  job: JobStats | null;
}

export function getAnalysisStatus(): AnalysisStatus {
  return { running: workerRunning, queued: queue.length, job: jobStats };
}

export function enqueueAnalysis(mediaIds: string[]) {
  const ids = mediaIds.filter(Boolean);
  if (ids.length === 0) return;
  // A finished run becomes a fresh batch when new items arrive
  if (!workerRunning && queue.length === 0) {
    jobStats = { startedAt: Date.now(), total: ids.length, done: 0, ok: 0, failed: 0, skipped: 0 };
  } else if (jobStats) {
    jobStats.total += ids.length;
  }
  queue.push(...ids);
  void runWorker().catch(() => {});
}

export function startMissingCategorization(): { started: boolean; count: number } {
  // Seeds the queue with every photo that has no category yet (backfill). The
  // worker may already be draining other items; missing ones append after.
  const result = { started: true, count: 0 };
  void (async () => {
    result.count = await countMissingCategories();
    if (result.count === 0) {
      if (!workerRunning && queue.length === 0) {
        jobStats = { startedAt: Date.now(), total: 0, done: 0, ok: 0, failed: 0, skipped: 0 };
        workerRunning = false;
      }
      return;
    }
    // Unify with any previously-running batch so totals stay accurate
    if (!workerRunning && queue.length === 0) {
      jobStats = { startedAt: Date.now(), total: result.count, done: 0, ok: 0, failed: 0, skipped: 0 };
    } else if (jobStats) {
      jobStats.total += result.count;
    }
    queue.push(...(await listMissingCategories()));
    void runWorker().catch(() => {});
  })();
  return result;
}

async function countMissingCategories(): Promise<number> {
  const row = await dbGet<{ count: number }>(
    `SELECT COUNT(*) as count FROM adventure_media WHERE media_type = 'photo' AND (category IS NULL OR category = '')`
  );
  return row?.count ?? 0;
}

async function listMissingCategories(): Promise<string[]> {
  // Drain in pages so we never hold the whole list in memory at once
  const ids: string[] = [];
  const pageSize = 100;
  let offset = 0;
  while (true) {
    const rows = await dbAll<{ id: string }>(
      `SELECT id FROM adventure_media WHERE media_type = 'photo' AND (category IS NULL OR category = '') ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      pageSize,
      offset
    );
    ids.push(...rows.map((r) => r.id));
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return ids;
}

async function runWorker() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (!jobStats) jobStats = { startedAt: Date.now(), total: 0, done: 0, ok: 0, failed: 0, skipped: 0 };
      jobStats.done++;
      try {
        const analysis = await analyzeMediaRow(id);
        if (analysis) {
          jobStats.ok++;
        } else {
          jobStats.failed++;
        }
      } catch (e) {
        jobStats.failed++;
        console.error('[ai] worker failed for media', id, e);
      }
    }
  } finally {
    workerRunning = false;
  }
}

// Analyzes a single media row from disk + persists the result. Returns null
// when the media can't be analyzed (video / missing file / AI disabled / no
// usable model output).
export async function analyzeMediaRow(mediaId: string): Promise<VisionAnalysis | null> {
  const media = await dbGet<{ id: string; file_path: string | null; media_type: string }>(
    'SELECT id, file_path, media_type FROM adventure_media WHERE id = ?',
    mediaId
  );
  if (!media) return null;
  if (media.media_type !== 'photo') return null;
  if (!(await isAIEnabled())) return null;
  const vision = await hasVisionSupport();
  if (!vision.ok) return null;
  if (!media.file_path) return null;

  const filename = media.file_path.replace('/uploads/', '');
  let buffer: Buffer;
  try {
    buffer = readFileSync(join(UPLOAD_DIR, filename));
  } catch {
    console.error('[ai] file missing for media', mediaId, media.file_path);
    return null;
  }

  const analysis = await analyzeImage(buffer.toString('base64'), guessImageMime(media.file_path || ''));
  if (!analysis) return null;

  await dbRun(
    'UPDATE adventure_media SET ai_caption = ?, category = ?, ai_tags = ? WHERE id = ?',
    analysis.caption,
    analysis.category,
    JSON.stringify(analysis.tags),
    mediaId
  );
  return analysis;
}