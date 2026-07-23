import { env } from '$env/dynamic/private';
import type { ImmichAsset } from '$lib/shared/types';

const IMMICH_API_URL = env.IMMICH_API_URL?.trim().replace(/\/$/, '');
const IMMICH_API_KEY = env.IMMICH_API_KEY?.trim();

function getHeaders() {
  const headers = new Headers();
  headers.set('accept', 'application/json');
  if (IMMICH_API_KEY) {
    headers.set('x-api-key', IMMICH_API_KEY);
  }
  return headers;
}

export function isImmichConfigured(): boolean {
  return Boolean(IMMICH_API_URL && IMMICH_API_KEY);
}

export function getImmichAssetUrl(assetId: string, isThumbnail = false): string {
  if (!assetId) return '/placeholder.svg';
  const query = isThumbnail ? '?thumbnail=1' : '';
  return `/api/immich/asset/${assetId}${query}`;
}

export async function getImmichUser(userId: string): Promise<{ id: string; name: string; email: string; avatarColor: string } | null> {
  if (!isImmichConfigured()) return null;

  try {
    const response = await fetch(`${IMMICH_API_URL}/users/${userId}`, {
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function getImmichCurrentUser(apiKey: string): Promise<{ id: string; name: string; email: string; profileImagePath?: string } | null> {
  if (!IMMICH_API_URL) return null;

  try {
    const headers = new Headers();
    headers.set('accept', 'application/json');
    headers.set('x-api-key', apiKey);

    const response = await fetch(`${IMMICH_API_URL}/users/me`, {
      headers,
      cache: 'no-store'
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function loginWithApiKey(apiKey: string): Promise<{ accessToken: string; userId: string; userEmail: string; name: string } | null> {
  if (!IMMICH_API_URL) return null;

  try {
    const response = await fetch(`${IMMICH_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey }),
      cache: 'no-store'
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function getAlbumAssets(albumId: string): Promise<ImmichAsset[]> {
  if (!albumId || !isImmichConfigured()) return [];

  try {
    const response = await fetch(`${IMMICH_API_URL}/albums/${albumId}`, {
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data?.assets || [];
  } catch {
    return [];
  }
}

export async function getAsset(assetId: string): Promise<ImmichAsset | null> {
  if (!assetId || !isImmichConfigured()) return null;

  try {
    const response = await fetch(`${IMMICH_API_URL}/assets/${assetId}`, {
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function proxyAsset(assetId: string, isThumbnail = false): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  if (!assetId || !isImmichConfigured()) return null;

  const targetUrl = `${IMMICH_API_URL}/asset/${isThumbnail ? 'thumbnail' : 'file'}/${assetId}`;

  try {
    const response = await fetch(targetUrl, {
      headers: getHeaders()
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function searchAssets(query: string): Promise<ImmichAsset[]> {
  if (!query || !isImmichConfigured()) return [];

  try {
    const response = await fetch(`${IMMICH_API_URL}/search/metadata`, {
      method: 'POST',
      headers: {
        ...Object.fromEntries(getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        size: 20,
        page: 1,
        clip: true
      }),
      cache: 'no-store'
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data?.assets?.items || [];
  } catch {
    return [];
  }
}

export async function getAlbums(): Promise<{ id: string; albumName: string; assetCount: number }[]> {
  if (!isImmichConfigured()) return [];

  try {
    const response = await fetch(`${IMMICH_API_URL}/albums`, {
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data || [];
  } catch {
    return [];
  }
}
