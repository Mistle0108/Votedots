import type { Request, Response } from "express";
import { finalResultImageService } from "../history/final-result-image.service";

function parseId(value: string | string[] | undefined): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const publicCanvasController = {
  async getFinalResultImage(req: Request, res: Response) {
    try {
      const canvasId = parseId(req.params["canvasId"]);

      if (!canvasId) {
        return res.status(400).json({
          message: "Invalid canvas id.",
        });
      }

      const { absolutePath, mimeType } =
        await finalResultImageService.getFinalResultAsset(canvasId);

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.type(mimeType);

      return res.sendFile(absolutePath);
    } catch (error) {
      return res.status(404).json({
        message: String(error),
      });
    }
  },

  async getFinalResultHighResolutionDownloadImage(req: Request, res: Response) {
    try {
      const canvasId = parseId(req.params["canvasId"]);

      if (!canvasId) {
        return res.status(400).json({
          message: "Invalid canvas id.",
        });
      }

      const { absolutePath, mimeType } =
        await finalResultImageService.ensureFinalResultDownloadAsset(
          canvasId,
          "hd",
        );

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.type(mimeType);

      return res.sendFile(absolutePath);
    } catch (error) {
      return res.status(404).json({
        message: String(error),
      });
    }
  },
};
