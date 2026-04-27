import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getLoginBoardContentRoot } from "../../config/login-board-content.config";
import type {
  LoginBoardPayload,
  PatchChangeType,
  PatchEntry,
  PatchVersionGroup,
  RoadmapEntry,
  RoadmapQuarterGroup,
} from "./login-board.types";

type FrontmatterValue = string | number | boolean | null;
type FrontmatterRecord = Record<string, FrontmatterValue>;

interface MarkdownDocument {
  fileName: string;
  attributes: FrontmatterRecord;
  body: string;
}

interface PatchItemWithOrder extends PatchEntry {
  order: number;
}

interface PatchGroupWithItems extends Omit<PatchVersionGroup, "items"> {
  items: PatchItemWithOrder[];
}

interface RoadmapItemWithOrder extends RoadmapEntry {
  order: number;
}

interface RoadmapGroupWithItems extends Omit<RoadmapQuarterGroup, "items"> {
  items: RoadmapItemWithOrder[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseFrontmatter(source: string): {
  attributes: FrontmatterRecord;
  body: string;
} {
  const match = source.match(FRONTMATTER_RE);

  if (!match) {
    return {
      attributes: {},
      body: source.trim(),
    };
  }

  const attributes: FrontmatterRecord = {};
  const frontmatter = match[1] ?? "";

  for (const rawLine of frontmatter.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    attributes[key] = parseFrontmatterValue(rawValue);
  }

  return {
    attributes,
    body: source.slice(match[0].length).trim(),
  };
}

function parseFrontmatterValue(rawValue: string): FrontmatterValue {
  const value = stripQuotes(rawValue.trim());

  if (!value) {
    return "";
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (value === "null") {
    return null;
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function expectString(
  attributes: FrontmatterRecord,
  key: string,
  fileName: string,
): string {
  const value = attributes[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`[login-board] "${fileName}" is missing "${key}"`);
  }

  return value.trim();
}

function readBoolean(
  attributes: FrontmatterRecord,
  key: string,
  fallback = false,
): boolean {
  const value = attributes[key];

  return typeof value === "boolean" ? value : fallback;
}

function readNumber(
  attributes: FrontmatterRecord,
  key: string,
  fallback = 0,
): number {
  const value = attributes[key];

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readPatchType(
  attributes: FrontmatterRecord,
  fileName: string,
): PatchChangeType {
  const value = expectString(attributes, "type", fileName);

  if (value === "feature" || value === "bugfix" || value === "breaking") {
    return value;
  }

  throw new Error(
    `[login-board] "${fileName}" has invalid patch type "${value}"`,
  );
}

function readPatchBadge(
  attributes: FrontmatterRecord,
  fileName: string,
): "Latest" | "Stable" | null {
  const value = attributes.badge;

  if (value == null || value === "") {
    return null;
  }

  if (value === "Latest" || value === "Stable") {
    return value;
  }

  throw new Error(
    `[login-board] "${fileName}" has invalid patch badge "${String(value)}"`,
  );
}

async function readMarkdownDocuments(
  directoryPath: string,
): Promise<MarkdownDocument[]> {
  try {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    return Promise.all(
      files.map(async (fileName) => {
        const absolutePath = path.join(directoryPath, fileName);
        const content = await readFile(absolutePath, "utf8");
        const { attributes, body } = parseFrontmatter(content);

        return {
          fileName,
          attributes,
          body,
        };
      }),
    );
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;

    if (maybeError.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function sortPatchGroups(groups: PatchGroupWithItems[]): PatchVersionGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: [...group.items]
        .sort((a, b) => a.order - b.order || a.date.localeCompare(b.date))
        .map(({ order: _order, ...item }) => item),
    }))
    .sort(
      (a, b) =>
        b.releaseDate.localeCompare(a.releaseDate) ||
        b.version.localeCompare(a.version),
    );
}

function sortRoadmapGroups(
  groups: RoadmapGroupWithItems[],
): RoadmapQuarterGroup[] {
  const getLatestUpdatedAt = (group: { items: Array<{ updatedAt: string }> }) =>
    [...group.items]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.updatedAt ??
    "";

  return groups
    .map((group) => ({
      ...group,
      items: [...group.items]
        .sort(
          (a, b) =>
            a.order - b.order || b.updatedAt.localeCompare(a.updatedAt),
        )
        .map(({ order: _order, ...item }) => item),
    }))
    .sort((a, b) => getLatestUpdatedAt(b).localeCompare(getLatestUpdatedAt(a)));
}

async function loadPatchGroups(rootPath: string): Promise<PatchVersionGroup[]> {
  const documents = await readMarkdownDocuments(path.join(rootPath, "patches"));
  const groups = new Map<string, PatchGroupWithItems>();

  for (const document of documents) {
    try {
      const groupId = expectString(document.attributes, "groupId", document.fileName);
      const item: PatchItemWithOrder = {
        id: expectString(document.attributes, "id", document.fileName),
        title: expectString(document.attributes, "title", document.fileName),
        date: expectString(document.attributes, "date", document.fileName),
        type: readPatchType(document.attributes, document.fileName),
        content: document.body,
        order: readNumber(document.attributes, "order", 0),
      };

      const existingGroup = groups.get(groupId);

      if (existingGroup) {
        existingGroup.items.push(item);
        continue;
      }

      groups.set(groupId, {
        id: groupId,
        version: expectString(document.attributes, "version", document.fileName),
        releaseDate: expectString(
          document.attributes,
          "releaseDate",
          document.fileName,
        ),
        badge: readPatchBadge(document.attributes, document.fileName),
        defaultOpen: readBoolean(document.attributes, "defaultOpen", false),
        items: [item],
      });
    } catch (error) {
      console.error(error);
    }
  }

  return sortPatchGroups([...groups.values()]);
}

async function loadRoadmapGroups(
  rootPath: string,
): Promise<RoadmapQuarterGroup[]> {
  const documents = await readMarkdownDocuments(path.join(rootPath, "roadmap"));
  const groups = new Map<string, RoadmapGroupWithItems>();

  for (const document of documents) {
    try {
      const groupId = expectString(document.attributes, "groupId", document.fileName);
      const item: RoadmapItemWithOrder = {
        id: expectString(document.attributes, "id", document.fileName),
        title: expectString(document.attributes, "title", document.fileName),
        summary: expectString(document.attributes, "summary", document.fileName),
        date: expectString(document.attributes, "date", document.fileName),
        updatedAt: expectString(
          document.attributes,
          "updatedAt",
          document.fileName,
        ),
        content: document.body,
        order: readNumber(document.attributes, "order", 0),
      };

      const existingGroup = groups.get(groupId);

      if (existingGroup) {
        existingGroup.items.push(item);
        continue;
      }

      groups.set(groupId, {
        id: groupId,
        quarter: expectString(document.attributes, "quarter", document.fileName),
        dueDate: expectString(document.attributes, "dueDate", document.fileName),
        defaultOpen: readBoolean(document.attributes, "defaultOpen", false),
        items: [item],
      });
    } catch (error) {
      console.error(error);
    }
  }

  return sortRoadmapGroups([...groups.values()]);
}

export const loginBoardContentService = {
  async getBoardPayload(): Promise<LoginBoardPayload> {
    const rootPath = getLoginBoardContentRoot();
    const [patches, roadmap] = await Promise.all([
      loadPatchGroups(rootPath),
      loadRoadmapGroups(rootPath),
    ]);

    return {
      patches,
      roadmap,
      generatedAt: new Date().toISOString(),
    };
  },
};
