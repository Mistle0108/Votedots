import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { RESULT_TEMPLATES } from "./result-template.data";
import type { ResultTemplate } from "./result-template.types";

const SIZE_FOLDER_ASSET_SUFFIXES = new Set([
  "32x32",
  "64x64",
  "128x128",
  "256x256",
  "512x512",
  "1024x1024",
]);

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function getAssetSizeFolder(assetKey: string): string | null {
  const matched = assetKey.match(/-(\d+x\d+)$/);
  const sizeFolder = matched?.[1] ?? null;

  if (!sizeFolder || !SIZE_FOLDER_ASSET_SUFFIXES.has(sizeFolder)) {
    return null;
  }

  return sizeFolder;
}

function buildResultTemplateCandidatePaths(assetKey: string): string[] {
  const sizeFolder = getAssetSizeFolder(assetKey);

  return [
    ...(sizeFolder
      ? [
          path.resolve(
            "/app/result-templates",
            sizeFolder,
            `${assetKey}.png`,
          ),
        ]
      : []),
    path.resolve("/app/result-templates", `${assetKey}.png`),
    path.resolve("/app/game-backgrounds", `${assetKey}.png`),
    ...(sizeFolder
      ? [
          path.resolve(
            __dirname,
            "../../../../../frontend/public/result-templates",
            sizeFolder,
            `${assetKey}.png`,
          ),
        ]
      : []),
    path.resolve(
      __dirname,
      "../../../../../frontend/public/result-templates",
      `${assetKey}.png`,
    ),
    path.resolve(
      __dirname,
      "../../../../../frontend/public/game-backgrounds",
      `${assetKey}.png`,
    ),
  ];
}

function resolveLegacyResultTemplateAssetKey(
  backgroundAssetKey: string | null,
): string | null {
  if (!backgroundAssetKey) {
    return null;
  }

  return backgroundAssetKey;
}

export function pickRandomResultTemplate(
  gridX: number,
  gridY: number,
): ResultTemplate | null {
  const candidates = RESULT_TEMPLATES.filter(
    (template) => template.gridX === gridX && template.gridY === gridY,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[randomIndex(candidates.length)] ?? null;
}

export function resolveResultTemplateAssetKey(params: {
  resultTemplateAssetKey: string | null;
  backgroundAssetKey: string | null;
}): string | null {
  return (
    params.resultTemplateAssetKey ??
    resolveLegacyResultTemplateAssetKey(params.backgroundAssetKey)
  );
}

export async function loadResultTemplateAsset(
  assetKey: string | null,
): Promise<Buffer | null> {
  if (!assetKey) {
    return null;
  }

  for (const absolutePath of buildResultTemplateCandidatePaths(assetKey)) {
    try {
      await access(absolutePath);
      return await readFile(absolutePath);
    } catch {
      continue;
    }
  }

  return null;
}
