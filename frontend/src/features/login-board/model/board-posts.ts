import type { PatchChangeType } from "./board.types";

export function getPatchTypeLabel(
  type: PatchChangeType,
  translate: (key: string) => string,
) {
  switch (type) {
    case "feature":
      return translate("loginBoard.patchType.feature");
    case "bugfix":
      return translate("loginBoard.patchType.bugfix");
    case "breaking":
      return translate("loginBoard.patchType.breaking");
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
