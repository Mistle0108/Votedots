import type { PatchChangeType } from "./board.types";

export function getPatchTypeLabel(type: PatchChangeType) {
  switch (type) {
    case "feature":
      return "신기능";
    case "bugfix":
      return "버그픽스";
    case "breaking":
      return "Breaking";
    default:
      return type;
  }
}

export function getPatchBadgeTone(
  type: PatchChangeType,
): "blue" | "green" | "red" {
  switch (type) {
    case "feature":
      return "blue";
    case "bugfix":
      return "green";
    case "breaking":
      return "red";
  }
}
