import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { env } from '$env/dynamic/private';

const execFileAsync = promisify(execFile);

const STATIC_DIR = join(process.cwd(), 'static');
const UPLOAD_DIR = env.UPLOAD_DIR || './build/client/uploads';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif'
  };
  return map[mime] || '.png';
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || user.role !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type by extension (not MIME, to handle HEIC etc.)
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return json({ error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 });
    }

    // Save uploaded file to temp location
    const tempName = `logo-upload-${Date.now()}${ext}`;
    const tempPath = join(UPLOAD_DIR, tempName);
    await mkdir(dirname(tempPath), { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    // Run Python processing script
    const scriptPath = join(process.cwd(), 'scripts', 'process-logo.py');

    try {
      const { stdout, stderr } = await execFileAsync('python3', [scriptPath, tempPath, STATIC_DIR], {
        timeout: 30000
      });
      console.log('Logo processing output:', stdout);
      if (stderr) console.error('Logo processing stderr:', stderr);
    } catch (execError: any) {
      console.error('Python script failed:', execError.message);
      // Clean up temp file
      await unlink(tempPath).catch(() => {});
      return json({ error: 'Image processing failed. Ensure Python and Pillow are installed.', details: execError.message }, { status: 500 });
    }

    // Clean up temp file
    await unlink(tempPath).catch(() => {});

    // Update site_config in database
    await dbRun(
      'INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)',
      'logo_filename', 'logo.png'
    );

    return json({
      success: true,
      logoUrl: `/logo.png?v=${Date.now()}`,
      faviconUrl: `/favicon.png?v=${Date.now()}`,
      ogImageUrl: `/og-image.png?v=${Date.now()}`
    });

  } catch (err: any) {
    console.error('Logo upload error:', err);
    return json({ error: 'Upload failed: ' + err.message }, { status: 500 });
  }
};
