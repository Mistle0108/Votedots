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

function copyPixel(
  source: PNG,
  target: PNG,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): void {
  const sourceIndex = (source.width * sourceY + sourceX) << 2;
  const targetIndex = (target.width * targetY + targetX) << 2;

  target.data[targetIndex] = source.data[sourceIndex] ?? 0;
  target.data[targetIndex + 1] = source.data[sourceIndex + 1] ?? 0;
  target.data[targetIndex + 2] = source.data[sourceIndex + 2] ?? 0;
  target.data[targetIndex + 3] = source.data[sourceIndex + 3] ?? 0;
}

function getDownloadScale(width: number, height: number, maxLongestSide: number) {
  const longestSide = Math.max(width, height);

  if (longestSide <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor(maxLongestSide / longestSide));
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

  buildDownloadPngBuffer(params: {
    sourceBuffer: Buffer;
    maxLongestSide: number;
  }): Buffer {
    const sourcePng = PNG.sync.read(params.sourceBuffer);
    const scale = getDownloadScale(
      sourcePng.width,
      sourcePng.height,
      params.maxLongestSide,
    );

    if (scale === 1) {
      return params.sourceBuffer;
    }

    const targetPng = new PNG({
      width: sourcePng.width * scale,
      height: sourcePng.height * scale,
    });

    for (let y = 0; y < sourcePng.height; y += 1) {
      for (let x = 0; x < sourcePng.width; x += 1) {
        const targetStartX = x * scale;
        const targetStartY = y * scale;

        for (let offsetY = 0; offsetY < scale; offsetY += 1) {
          for (let offsetX = 0; offsetX < scale; offsetX += 1) {
            copyPixel(
              sourcePng,
              targetPng,
              x,
              y,
              targetStartX + offsetX,
              targetStartY + offsetY,
            );
          }
        }
      }
    }

    return PNG.sync.write(targetPng);
  },
};
