import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { writeFile, mkdir, access, unlink } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { optimizeImageOnUpload } from '$lib/server/image';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads';
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'jpg': ['image/jpeg'], 'jpeg': ['image/jpeg'], 'png': ['image/png'],
  'gif': ['image/gif'], 'webp': ['image/webp'],
  'heic': ['image/heic', 'image/heif', 'application/octet-stream', ''],
  'heif': ['image/heic', 'image/heif', 'application/octet-stream', ''],
  'mp4': ['video/mp4', 'video/quicktime', 'application/octet-stream'],
  'webm': ['video/webm', 'application/octet-stream'],
  'mov': ['video/quicktime', 'video/mp4', 'application/octet-stream'],
  'mp3': ['audio/mpeg', 'audio/mp3', 'application/octet-stream'],
  'wav': ['audio/wav', 'audio/wave', 'application/octet-stream'],
  'ogg': ['audio/ogg', 'application/octet-stream'],
  'avi': ['video/avi', 'video/msvideo', 'application/octet-stream'],
  'hevc': ['video/hevc', 'application/octet-stream']
};

function isAllowedFile(file: File): { ok: boolean; reason?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExts = ALLOWED_EXTENSIONS[ext];
  if (!allowedExts) return { ok: false, reason: `File type not allowed: .${ext}` };
  if (allowedExts.includes(file.type)) return { ok: true };
  if (file.type === '' || file.type === 'application/octet-stream') return { ok: true };
  return { ok: false, reason: `File type not allowed: ${file.type}` };
}

async function ensureUploadDir() {
  try {
    await access(UPLOAD_DIR);
  } catch {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

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

  await ensureUploadDir();

  const results: { filePath: string; filename: string; error?: string }[] = [];

  for (const file of files) {
    const check = isAllowedFile(file);
    if (!check.ok) {
      results.push({ filePath: '', filename: file.name, error: check.reason });
      continue;
    }

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const timestamp = Date.now();
      const random = randomBytes(8).toString('hex');
      const filename = `${timestamp}-${random}.${ext}`;
      const filepath = join(UPLOAD_DIR, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      // Optimize images for the web (resize + recompress). Videos/audio and
      // formats we can't decode (e.g. HEIC without a plugin) are left untouched.
      const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|bmp|tiff?)$/i;
      let storedFilename = filename;
      if (IMAGE_EXT.test(filename)) {
        const destBase = join(UPLOAD_DIR, `${timestamp}-${random}-o`);
        const optimized = await optimizeImageOnUpload(filepath, destBase);
        if (optimized) {
          // Swap to the optimized file and drop the raw original to avoid orphans
          const optimizedPath = join(UPLOAD_DIR, optimized);
          const exists = await access(optimizedPath).then(() => true).catch(() => false);
          if (exists) {
            await unlink(filepath).catch(() => {});
          }
          storedFilename = optimized;
        }
      }

      results.push({ filePath: `/uploads/${storedFilename}`, filename: storedFilename });
    } catch (e) {
      results.push({ filePath: '', filename: file.name, error: 'Failed to write file' });
    }
  }

  return json({ files: results });
};
