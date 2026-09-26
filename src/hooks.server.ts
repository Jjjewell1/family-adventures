import type { Handle, HandleServerError } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'fs';
import { join, extname, normalize } from 'path';
import { resolve as pathResolve } from 'path';

const UPLOAD_DIR = pathResolve(process.env.UPLOAD_DIR || './data/uploads');

export const handleError: HandleServerError = ({ error, event }) => {
  console.error(`[ERROR] ${event.request.method} ${event.url.pathname}:`, error);
  return { message: 'Internal Error' };
};

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/uploads/')) {
    const filename = event.url.pathname.replace('/uploads/', '');
    const filepath = join(UPLOAD_DIR, normalize(filename));

    if (!filepath.startsWith(UPLOAD_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (existsSync(filepath)) {
      const ext = extname(filepath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const data = readFileSync(filepath);

      return new Response(data, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  const response = await resolve(event);

  // A document must never be served from cache without revalidation. It
  // references content-hashed assets, so one stale copy pins an entire old build
  // in the browser — which reads as "the deploy never landed" even when it did.
  // Hashed assets keep their immutable year-long cache; only the HTML is volatile.
  // no-cache rather than no-store so the service worker can still keep a copy
  // for offline use.
  if (response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set('cache-control', 'no-cache, must-revalidate');
  }

  return response;
};
