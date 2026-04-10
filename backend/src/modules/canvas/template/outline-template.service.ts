import { OUTLINE_TEMPLATES } from "./outline-template.data";
import type { OutlineTemplate } from "./outline-template.types";

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

export function pickRandomOutlineTemplate(
  gridX: number,
  gridY: number,
): OutlineTemplate | null {
  const candidates = OUTLINE_TEMPLATES.filter(
    (template) => template.gridX === gridX && template.gridY === gridY,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[randomIndex(candidates.length)] ?? null;
}

export function buildOutlineCellSet(
  template: OutlineTemplate | null,
): Set<string> {
  if (!template) {
    return new Set();
  }

  return new Set(template.cells.map((cell) => `${cell.x}:${cell.y}`));
}
