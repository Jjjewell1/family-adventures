import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, extname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { env } from '$env/dynamic/private';

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = resolve(env.UPLOAD_DIR || './data/uploads');
const THUMB_DIR = join(UPLOAD_DIR, '.thumbs');
const SCRIPT = join(process.cwd(), 'scripts', 'optimize-image.py');

// Raster image formats we can serve/tile. Everything else (video, audio) is left untouched.
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.bmp', '.tiff', '.tif']);

/**
 * Optimize an uploaded image for the web (resize + recompress). Returns the new
 * relative filename (e.g. "<ts>-<rand>.jpg") on success, or null if the file was
 * left as-is (unreadable format, or the optimizer chose to skip).
 */
export async function optimizeImageOnUpload(
  absSrcPath: string,
  destBase: string
): Promise<string | null> {
  if (!existsSync(absSrcPath)) return null;

  try {
    const { stdout } = await execFileAsync('python3', [SCRIPT, absSrcPath, destBase], {
      timeout: 30000,
      encoding: 'utf8'
    });
    const lines = stdout.trim().split('\n').filter(Boolean);
    const filename = lines[lines.length - 1];
    if (!filename || filename === 'SKIP') return null;
    return filename;
  } catch {
    // SKIP (unreadable format) or failure -> keep the original upload
    return null;
  }
}

/**
 * Produce a width-limited, cached web version of an uploaded image, mirroring the
 * video-thumbnail pattern: generated once and stored under .thumbs/, served immutably.
 * Returns an absolute path to the generated file, or null if a version isn't possible/needed.
 */
export async function getImageVersion(absSrcPath: string, width: number): Promise<string | null> {
  const srcExt = extname(absSrcPath).toLowerCase();
  if (!IMAGE_EXTS.has(srcExt)) return null;
  if (!existsSync(absSrcPath)) return null;

  mkdirSync(THUMB_DIR, { recursive: true });

  // Deterministic cache name from the source rel path + requested width.
  const rel = absSrcPath.slice(UPLOAD_DIR.length).replace(/^[\\/]+/, '');
  const baseName = rel.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '_');
  const cacheBase = join(THUMB_DIR, `${baseName}.w${width}`);

  // The optimizer writes .jpg for opaque photos and .png for images with alpha.
  const candidates = [`${cacheBase}.jpg`, `${cacheBase}.png`];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  try {
    await execFileAsync('python3', [SCRIPT, absSrcPath, cacheBase, String(width), '82'], {
      timeout: 30000
    });
  } catch {
    return null;
  }

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}
