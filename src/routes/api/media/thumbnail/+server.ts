import type { RequestHandler } from './$types';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, extname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { env } from '$env/dynamic/private';

const execFileAsync = promisify(execFile);
const UPLOAD_DIR = env.UPLOAD_DIR || './data/uploads';
const THUMB_DIR = join(UPLOAD_DIR, '.thumbs');

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.mts', '.m4v']);

export const GET: RequestHandler = async ({ url }) => {
  const filePath = url.searchParams.get('path');
  if (!filePath) return new Response('Missing path', { status: 400 });

  // Sanitize — only allow /uploads/ paths
  const cleanPath = filePath.replace(/^\/+/, '');
  if (!cleanPath.startsWith('uploads/')) return new Response('Forbidden', { status: 403 });

  const absPath = join(process.cwd(), cleanPath);
  if (!existsSync(absPath)) return new Response('Not found', { status: 404 });

  const ext = extname(absPath).toLowerCase();
  if (!VIDEO_EXTS.has(ext)) return new Response('Not a video', { status: 400 });

  // Check for cached thumbnail
  const thumbName = cleanPath.replace('uploads/', '').replace(/\.[^.]+$/, '') + '.jpg';
  const thumbPath = join(THUMB_DIR, thumbName);

  if (existsSync(thumbPath)) {
    return new Response(readFileSync(thumbPath), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' }
    });
  }

  // Generate thumbnail with ffmpeg
  try {
    const { mkdirSync } = await import('fs');
    mkdirSync(THUMB_DIR, { recursive: true });

    await execFileAsync('ffmpeg', [
      '-i', absPath,
      '-ss', '00:00:00.5',
      '-vframes', '1',
      '-vf', 'scale=480:-1',
      '-q:v', '4',
      thumbPath
    ], { timeout: 15000 });

    return new Response(readFileSync(thumbPath), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' }
    });
  } catch (e) {
    // ffmpeg failed — return a 1x1 transparent pixel so the client doesn't hang
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return new Response(pixel, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'public, max-age=60' }
    });
  }
};
