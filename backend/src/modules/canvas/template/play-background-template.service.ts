import { PLAY_BACKGROUND_TEMPLATES } from "./play-background-template.data";
import type { PlayBackgroundTemplate } from "./play-background-template.types";

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

export function pickRandomPlayBackgroundTemplate(
  gridX: number,
  gridY: number,
): PlayBackgroundTemplate | null {
  const candidates = PLAY_BACKGROUND_TEMPLATES.filter(
    (template) => template.gridX === gridX && template.gridY === gridY,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[randomIndex(candidates.length)] ?? null;
}
