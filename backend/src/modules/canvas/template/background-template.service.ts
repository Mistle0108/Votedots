import { BACKGROUND_TEMPLATES } from "./background-template.data";
import type { BackgroundTemplate } from "./background-template.types";

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

export function pickRandomBackgroundTemplate(
  gridX: number,
  gridY: number,
): BackgroundTemplate | null {
  const candidates = BACKGROUND_TEMPLATES.filter(
    (template) => template.gridX === gridX && template.gridY === gridY,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[randomIndex(candidates.length)] ?? null;
}
