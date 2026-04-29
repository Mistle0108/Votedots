const SIZE_FOLDER_ASSET_SUFFIXES = new Set([
  "32x32",
  "64x64",
  "128x128",
  "256x256",
  "512x512",
  "1024x1024",
]);

function getAssetSizeFolder(assetKey: string): string | null {
  const matched = assetKey.match(/-(\d+x\d+)$/);
  const sizeFolder = matched?.[1] ?? null;

  if (!sizeFolder || !SIZE_FOLDER_ASSET_SUFFIXES.has(sizeFolder)) {
    return null;
  }

  return sizeFolder;
}

export function getPlayBackgroundImageUrl(assetKey: string | null): string | null {
  if (!assetKey) {
    return null;
  }

  const sizeFolder = getAssetSizeFolder(assetKey);

  if (sizeFolder) {
    return `/play-backgrounds/${sizeFolder}/${assetKey}.png`;
  }

  return `/play-backgrounds/${assetKey}.png`;
}

export function getResultTemplateImageUrl(
  assetKey: string | null,
): string | null {
  if (!assetKey) {
    return null;
  }

  const sizeFolder = getAssetSizeFolder(assetKey);

  if (sizeFolder) {
    return `/result-templates/${sizeFolder}/${assetKey}.png`;
  }

  return `/result-templates/${assetKey}.png`;
}

export function resolvePlayBackgroundImageUrl(params: {
  playBackgroundAssetKey: string | null;
}): string | null {
  return getPlayBackgroundImageUrl(params.playBackgroundAssetKey);
}

export function resolveResultTemplateImageUrl(params: {
  resultTemplateAssetKey: string | null;
}): string | null {
  return getResultTemplateImageUrl(params.resultTemplateAssetKey);
}
