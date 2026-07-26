import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { dbRun, dbGet } from '$lib/server/db';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { env } from '$env/dynamic/private';

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = env.UPLOAD_DIR || './build/client/uploads';
const BRANDING_DIR = join(UPLOAD_DIR, 'branding');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

export const GET: RequestHandler = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || user.role !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    await mkdir(BRANDING_DIR, { recursive: true });
    const files = await readdir(BRANDING_DIR);

    const logos = files
      .filter(f => f.startsWith('logo-') && f.endsWith('.png'))
      .map(f => {
        const ts = f.replace('logo-', '').replace('.png', '');
        return {
          filename: f,
          logoPath: `/uploads/branding/${f}`,
          faviconPath: `/uploads/branding/favicon-${ts}.png`,
          ogPath: `/uploads/branding/og-${ts}.png`,
          timestamp: parseInt(ts) || 0,
          date: new Date(parseInt(ts) || 0).toLocaleString()
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    const activeLogo = await getConfig('logo_filename');

    return json({ logos, activeLogo });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};

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

    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return json({ error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 });
    }

    await mkdir(BRANDING_DIR, { recursive: true });

    // Save raw upload to temp
    const tempName = `logo-upload-${Date.now()}${ext}`;
    const tempPath = join(BRANDING_DIR, tempName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    // Run Python script — output to branding dir with timestamp prefix
    const timestamp = Date.now();
    const outputPrefix = join(BRANDING_DIR, `logo-${timestamp}`);
    const scriptPath = join(process.cwd(), 'scripts', 'process-logo.py');

    try {
      const { stdout, stderr } = await execFileAsync('python3', [scriptPath, tempPath, outputPrefix], {
        timeout: 30000
      });
      console.log('Logo processing output:', stdout);
      if (stderr) console.error('Logo processing stderr:', stderr);
    } catch (execError: any) {
      console.error('Python script failed:', execError.message);
      await unlink(tempPath).catch(() => {});
      return json({ error: 'Image processing failed. Ensure Python and Pillow are installed.', details: execError.message }, { status: 500 });
    }

    // Clean up temp
    await unlink(tempPath).catch(() => {});

    // Update site_config
    const logoFilename = `branding/logo-${timestamp}.png`;
    await dbRun(
      'INSERT OR REPLACE INTO site_config (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))',
      'logo_filename', logoFilename
    );

    return json({
      success: true,
      logoUrl: `/uploads/branding/logo-${timestamp}.png?v=${timestamp}`,
      faviconUrl: `/uploads/branding/favicon-${timestamp}.png?v=${timestamp}`,
      ogImageUrl: `/uploads/branding/og-${timestamp}.png?v=${timestamp}`
    });

  } catch (err: any) {
    console.error('Logo upload error:', err);
    return json({ error: 'Upload failed: ' + err.message }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || user.role !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { logoFilename } = await request.json();
    if (!logoFilename) return json({ error: 'No logo filename provided' }, { status: 400 });

    // Verify the file exists
    const filePath = join(UPLOAD_DIR, logoFilename);
    try {
      await import('fs/promises').then(fs => fs.access(filePath));
    } catch {
      return json({ error: 'Logo file not found' }, { status: 404 });
    }

    await dbRun(
      'INSERT OR REPLACE INTO site_config (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))',
      'logo_filename', logoFilename
    );

    return json({
      success: true,
      logoUrl: `/uploads/${logoFilename}?v=${Date.now()}`
    });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || user.role !== 'admin') {
    return json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { filename } = await request.json();
    if (!filename) return json({ error: 'No filename provided' }, { status: 400 });

    // Extract timestamp from filename (logo-TIMESTAMP.png)
    const match = filename.match(/^logo-(\d+)\.png$/);
    if (!match) return json({ error: 'Invalid logo filename' }, { status: 400 });

    const ts = match[1];
    const activeLogo = await getConfig('logo_filename');

    // Don't delete the active logo
    if (activeLogo === `branding/logo-${ts}.png`) {
      return json({ error: 'Cannot delete the active logo. Set another as active first.' }, { status: 400 });
    }

    // Delete all files for this timestamp
    await unlink(join(BRANDING_DIR, `logo-${ts}.png`)).catch(() => {});
    await unlink(join(BRANDING_DIR, `favicon-${ts}.png`)).catch(() => {});
    await unlink(join(BRANDING_DIR, `og-${ts}.png`)).catch(() => {});

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};

// Helper
async function getConfig(key: string): Promise<string | null> {
  const row = await dbGet<{ value: string }>('SELECT value FROM site_config WHERE key = ?', key);
  return row?.value ?? null;
}
