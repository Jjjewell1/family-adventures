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
export const GET: RequestHandler = async ({ url }) => {
  const filePath = url.searchParams.get('path');
  const wParam = url.searchParams.get('w');

  if (!filePath) return new Response('Missing path', { status: 400 });

  const cleanPath = filePath.replace(/^\/+/, '');
  if (!cleanPath.startsWith('uploads/')) return new Response('Forbidden', { status: 403 });

  const absPath = join(UPLOAD_DIR, cleanPath.replace(/^uploads\//, ''));
  if (!existsSync(absPath)) return new Response('Not found', { status: 404 });

  let fileToServe = absPath;

  if (wParam) {
    let width = parseInt(wParam, 10);
    if (!Number.isFinite(width) || width < 1) width = 480;
    if (width > 2000) width = 2000;
    const version = await getImageVersion(absPath, width);
    // Fall back to the original if a resized version can't be made (video, etc.)
    if (version) fileToServe = version;
  }

  const data = readFileSync(fileToServe);
  return new Response(data, {
    headers: {
      'Content-Type': mimeFor(fileToServe),
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};
