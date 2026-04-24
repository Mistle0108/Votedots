function getLegacyPlayBackgroundAssetKey(
  assetKey: string | null,
): string | null {
  if (!assetKey || !assetKey.startsWith("empty-")) {
    return null;
  }

  return assetKey.replace(/^empty-/, "grid-");
}

function getLegacyResultTemplateAssetKey(
  assetKey: string | null,
): string | null {
  if (!assetKey) {
    return null;
  }

  return assetKey;
}

export function getPlayBackgroundImageUrl(assetKey: string | null): string | null {
  if (!assetKey) {
    return null;
  }

  return `/play-backgrounds/${assetKey}.png`;
}

export function getResultTemplateImageUrl(
  assetKey: string | null,
): string | null {
  if (!assetKey) {
    return null;
  }

  return `/result-templates/${assetKey}.png`;
}

export function resolvePlayBackgroundImageUrl(params: {
  playBackgroundAssetKey: string | null;
  backgroundAssetKey: string | null;
}): string | null {
  return getPlayBackgroundImageUrl(
    params.playBackgroundAssetKey ??
      getLegacyPlayBackgroundAssetKey(params.backgroundAssetKey),
  );
}

export function resolveResultTemplateImageUrl(params: {
  resultTemplateAssetKey: string | null;
  backgroundAssetKey: string | null;
}): string | null {
  if (params.resultTemplateAssetKey) {
    return getResultTemplateImageUrl(params.resultTemplateAssetKey);
  }

  const legacyAssetKey = getLegacyResultTemplateAssetKey(
    params.backgroundAssetKey,
  );

  if (!legacyAssetKey) {
    return null;
  }

  return `/game-backgrounds/${legacyAssetKey}.png`;
}
