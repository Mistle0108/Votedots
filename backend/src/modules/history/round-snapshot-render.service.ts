import jpeg from "jpeg-js";
import { PNG } from "pngjs";

interface SnapshotCell {
  x: number;
  y: number;
  color: string | null;
}

interface RenderRoundSnapshotParams {
  gridWidth: number;
  gridHeight: number;
  cells: SnapshotCell[];
  backgroundImageBuffer?: Buffer | null;
}

interface RenderRoundSnapshotResult {
  buffer: Buffer;
  imageWidth: number;
  imageHeight: number;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

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

function isPngBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function isJpegBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function decodeRasterBuffer(buffer: Buffer): PNG | null {
  if (isPngBuffer(buffer)) {
    return PNG.sync.read(buffer);
  }

  if (isJpegBuffer(buffer)) {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    const png = new PNG({ width: decoded.width, height: decoded.height });
    png.data = Buffer.from(decoded.data);
    return png;
  }

  return null;
}

function getDownloadScale(width: number, height: number, maxLongestSide: number) {
  const longestSide = Math.max(width, height);

  if (longestSide <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor(maxLongestSide / longestSide));
}

function resizePng(sourcePng: PNG, targetWidth: number, targetHeight: number): PNG {
  if (sourcePng.width === targetWidth && sourcePng.height === targetHeight) {
    return sourcePng;
  }

  const targetPng = new PNG({
    width: targetWidth,
    height: targetHeight,
  });

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(
      sourcePng.height - 1,
      Math.floor((y / targetHeight) * sourcePng.height),
    );

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(
        sourcePng.width - 1,
        Math.floor((x / targetWidth) * sourcePng.width),
      );

      copyPixel(sourcePng, targetPng, sourceX, sourceY, x, y);
    }
  }

  return targetPng;
}

function createBasePng(
  gridWidth: number,
  gridHeight: number,
  backgroundImageBuffer: Buffer | null = null,
): PNG {
  const basePng = new PNG({ width: gridWidth, height: gridHeight });

  if (backgroundImageBuffer) {
    try {
      const backgroundPng = decodeRasterBuffer(backgroundImageBuffer);

      if (backgroundPng) {
        return resizePng(backgroundPng, gridWidth, gridHeight);
      }
    } catch {
      return basePng;
    }
  }

  return basePng;
}

function getCellPixelBounds(params: {
  cellX: number;
  cellY: number;
  gridWidth: number;
  gridHeight: number;
  imageWidth: number;
  imageHeight: number;
}) {
  const { cellX, cellY, gridWidth, gridHeight, imageWidth, imageHeight } =
    params;

  const startX = Math.floor((cellX * imageWidth) / gridWidth);
  const startY = Math.floor((cellY * imageHeight) / gridHeight);
  const nextX = Math.floor(((cellX + 1) * imageWidth) / gridWidth);
  const nextY = Math.floor(((cellY + 1) * imageHeight) / gridHeight);

  return {
    startX,
    startY,
    endX: Math.max(startX + 1, nextX),
    endY: Math.max(startY + 1, nextY),
  };
}

function fillCellRect(
  png: PNG,
  cell: SnapshotCell,
  color: RgbColor,
  gridWidth: number,
  gridHeight: number,
): void {
  const { startX, startY, endX, endY } = getCellPixelBounds({
    cellX: cell.x,
    cellY: cell.y,
    gridWidth,
    gridHeight,
    imageWidth: png.width,
    imageHeight: png.height,
  });

  const clampedStartX = Math.max(0, Math.min(startX, png.width - 1));
  const clampedStartY = Math.max(0, Math.min(startY, png.height - 1));
  const clampedEndX = Math.max(clampedStartX + 1, Math.min(endX, png.width));
  const clampedEndY = Math.max(clampedStartY + 1, Math.min(endY, png.height));

  for (let y = clampedStartY; y < clampedEndY; y += 1) {
    for (let x = clampedStartX; x < clampedEndX; x += 1) {
      setPixelColor(png, x, y, color);
    }
  }
}

export const roundSnapshotRenderService = {
  renderPngBuffer({
    gridWidth,
    gridHeight,
    cells,
    backgroundImageBuffer = null,
  }: RenderRoundSnapshotParams): RenderRoundSnapshotResult {
    if (gridWidth <= 0 || gridHeight <= 0) {
      throw new Error("Round snapshot dimensions must be positive.");
    }

    const png = createBasePng(gridWidth, gridHeight, backgroundImageBuffer);

    for (const cell of cells) {
      if (!cell.color) {
        continue;
      }

      if (
        cell.x < 0 ||
        cell.y < 0 ||
        cell.x >= gridWidth ||
        cell.y >= gridHeight
      ) {
        continue;
      }

      fillCellRect(png, cell, parseHexColor(cell.color), gridWidth, gridHeight);
    }

    return {
      buffer: PNG.sync.write(png),
      imageWidth: png.width,
      imageHeight: png.height,
    };
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

    const targetPng = resizePng(
      sourcePng,
      sourcePng.width * scale,
      sourcePng.height * scale,
    );

    return PNG.sync.write(targetPng);
  },

  buildGridSizedPngBuffer(params: {
    sourceBuffer: Buffer;
    targetWidth: number;
    targetHeight: number;
  }): Buffer {
    const sourcePng = PNG.sync.read(params.sourceBuffer);
    const targetPng = resizePng(
      sourcePng,
      params.targetWidth,
      params.targetHeight,
    );

    return PNG.sync.write(targetPng);
  },
};
