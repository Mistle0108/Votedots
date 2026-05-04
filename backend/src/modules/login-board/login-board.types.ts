export type PatchChangeType = "feature" | "bugfix" | "breaking";

export interface PatchEntry {
  id: string;
  title: string;
  date: string;
  type: PatchChangeType;
  content: string;
}

export interface PatchVersionGroup {
  id: string;
  version: string;
  releaseDate: string;
  badge: "Latest" | "Stable" | null;
  defaultOpen: boolean;
  items: PatchEntry[];
}

export interface RoadmapEntry {
  id: string;
  title: string;
  summary: string;
  date: string;
  updatedAt: string;
  content: string;
}

export interface RoadmapQuarterGroup {
  id: string;
  quarter: string;
  dueDate: string;
  defaultOpen: boolean;
  items: RoadmapEntry[];
}

export interface LoginBoardPayload {
  patches: PatchVersionGroup[];
  roadmap: RoadmapQuarterGroup[];
  generatedAt: string;
}
