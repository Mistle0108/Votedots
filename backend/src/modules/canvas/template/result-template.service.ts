import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { RESULT_TEMPLATES } from "./result-template.data";
import type { ResultTemplate } from "./result-template.types";

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function buildResultTemplateCandidatePaths(assetKey: string): string[] {
  return [
    path.resolve("/app/result-templates", `${assetKey}.png`),
    path.resolve("/app/game-backgrounds", `${assetKey}.png`),
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
