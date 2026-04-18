export function getBackgroundImageUrl(assetKey: string | null): string | null {
  if (!assetKey) {
    return null;
  }

  return `/game-backgrounds/${assetKey}.png`;
}
