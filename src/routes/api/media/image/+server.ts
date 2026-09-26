import type { RequestHandler } from './$types';
import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { getImageVersion } from '$lib/server/image';
import { env } from '$env/dynamic/private';

const UPLOAD_DIR = resolve(env.UPLOAD_DIR || './data/uploads');

function mimeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'avif': return 'image/avif';
    default: return 'image/jpeg';
  }
}

// Serve an uploaded photo, optionally resized to a max width on demand, with a
// long immutable cache. Non-photo files (video/audio) fall back to the original.
// Usage: /api/media/image?path=/uploads/123-abc.jpg&w=480
//        /api/media/image?path=/uploads/123-abc.jpg&download=1
// `download=1` exists because the browser `download` attribute is unreliable on
// iOS Safari; the disposition header below is what makes saving work on a phone.
export const GET: RequestHandler = async ({ url }) => {
  const filePath = url.searchParams.get('path');
  const wParam = url.searchParams.get('w');
  const wantsDownload = url.searchParams.get('download') === '1';

  if (!filePath) return new Response('Missing path', { status: 400 });

  const cleanPath = filePath.replace(/^\/+/, '');
  if (!cleanPath.startsWith('uploads/')) return new Response('Forbidden', { status: 403 });

  const absPath = join(UPLOAD_DIR, cleanPath.replace(/^uploads\//, ''));
  if (!existsSync(absPath)) return new Response('Not found', { status: 404 });

  let fileToServe = absPath;

  // A download must be the original bytes, never a cached resize.
  if (wParam && !wantsDownload) {
    let width = parseInt(wParam, 10);
    if (!Number.isFinite(width) || width < 1) width = 480;
    if (width > 2000) width = 2000;
    const version = await getImageVersion(absPath, width);
    // Fall back to the original if a resized version can't be made (video, etc.)
    if (version) fileToServe = version;
  }

  const data = readFileSync(fileToServe);
  const headers: Record<string, string> = {
    'Content-Type': mimeFor(fileToServe),
    'Cache-Control': wantsDownload
      ? 'no-store'
      : 'public, max-age=31536000, immutable'
  };

  if (wantsDownload) {
    // Filenames come from the stored upload path, so only the basename survives
    // and anything quote- or newline-like is dropped rather than escaped.
    const base = (absPath.split(/[\\/]/).pop() ?? 'image').replace(/[^\w.\-]+/g, '_');
    headers['Content-Disposition'] = `attachment; filename="${base}"`;
  }

  return new Response(data, { headers });
};
