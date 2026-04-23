import { PNG } from "pngjs";

interface SnapshotCell {
  x: number;
  y: number;
  color: string | null;
}

interface RenderRoundSnapshotParams {
  width: number;
  height: number;
  cells: SnapshotCell[];
  outlineCells?: Array<{ x: number; y: number }>;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function normalizeHexColor(hex: string): string {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}

function parseHexColor(hex: string): RgbColor {
  const normalized = normalizeHexColor(hex);

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

const OUTLINE_COLOR = "#000000";

function setPixelColor(png: PNG, x: number, y: number, color: RgbColor): void {
  const index = (png.width * y + x) << 2;
  png.data[index] = color.r;
  png.data[index + 1] = color.g;
  png.data[index + 2] = color.b;
  png.data[index + 3] = 255;
}

function createBasePng(
  width: number,
  height: number,
  outlineCells: Array<{ x: number; y: number }> = [],
): PNG {
  const png = new PNG({ width, height });

  for (const cell of outlineCells) {
    if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) {
      continue;
    }

    setPixelColor(png, cell.x, cell.y, parseHexColor(OUTLINE_COLOR));
  }

  return png;
}

export const roundSnapshotRenderService = {
  renderPngBuffer({
    width,
    height,
    cells,
    outlineCells = [],
  }: RenderRoundSnapshotParams): Buffer {
    if (width <= 0 || height <= 0) {
      throw new Error("스냅샷 크기가 올바르지 않습니다.");
    }

    const png = createBasePng(width, height, outlineCells);

    for (const cell of cells) {
      if (!cell.color) {
        continue;
      }

      if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) {
        continue;
      }

      setPixelColor(png, cell.x, cell.y, parseHexColor(cell.color));
    }

    return PNG.sync.write(png);
  },
};
