import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { isAIEnabled, hasVisionSupport, getAnalysisStatus, startMissingCategorization } from '$lib/server/ai';

// Starts (or resumes) the serialized AI categorization worker for every photo
// that has no category yet. Run it from Settings → AI.
export const POST: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

  if (!(await isAIEnabled())) {
    return json({ error: 'AI is disabled. Enable it in Settings → AI first.' }, { status: 400 });
  }
  const vision = await hasVisionSupport();
  if (!vision.ok) {
    return json({ error: vision.error || 'The configured AI model cannot analyze images' }, { status: 400 });
  }

  const { started, count } = startMissingCategorization();
  return json({ started, missing: count });
};

// Live progress for the running / last finished batch.
export const GET: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  return json(getAnalysisStatus());
};