export function getImmichAssetUrl(assetId: string, isThumbnail = false): string {
  if (!assetId) return '/placeholder.svg';
  const query = isThumbnail ? '?thumbnail=1' : '';
  return `/api/immich/asset/${assetId}${query}`;
}
