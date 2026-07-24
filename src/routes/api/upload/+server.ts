import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './build/client/uploads';
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg'
];

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return json({ error: 'No files provided' }, { status: 400 });
  }

  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const results: { filePath: string; filename: string; error?: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      results.push({ filePath: '', filename: file.name, error: `File type not allowed: ${file.type}` });
      continue;
    }

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const timestamp = Date.now();
      const random = randomBytes(8).toString('hex');
      const filename = `${timestamp}-${random}.${ext}`;
      const filepath = join(UPLOAD_DIR, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(filepath, buffer);

      results.push({ filePath: `/uploads/${filename}`, filename });
    } catch (e) {
      results.push({ filePath: '', filename: file.name, error: 'Failed to write file' });
    }
  }

  return json({ files: results });
};
