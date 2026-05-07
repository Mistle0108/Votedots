import type { Request, Response } from "express";
import { publicLandingPreviewService } from "./public-landing-preview.service";
import { publicLandingService } from "./public-landing.service";

function parseId(value: string | string[] | undefined): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const publicLandingController = {
  async getLandingPayload(_req: Request, res: Response) {
    try {
      const payload = await publicLandingService.getLandingPayload();

      res.setHeader("Cache-Control", "no-store");
      return res.json(payload);
    } catch (error) {
      console.error("[public-landing] failed to load landing payload:", error);
      return res.status(500).json({
        message: "Failed to load landing payload.",
      });
    }
  },

  async getRoundSnapshot(req: Request, res: Response) {
    try {
      const canvasId = parseId(req.params["canvasId"]);
      const roundId = parseId(req.params["roundId"]);

      if (!canvasId || !roundId) {
        return res.status(400).json({
          message: "Invalid canvas or round id.",
        });
      }

      const { absolutePath, mimeType } =
        await publicLandingService.getRoundSnapshotAbsolutePath(canvasId, roundId);

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.type(mimeType);

      return res.sendFile(absolutePath);
    } catch (error) {
      return res.status(404).json({
        message: String(error),
      });
    }
  },

  async getFeaturedPreviews(_req: Request, res: Response) {
    try {
      const payload = await publicLandingPreviewService.getFeaturedPreviewPayload();

      res.setHeader("Cache-Control", "no-store");
      return res.json(payload);
    } catch (error) {
      console.error("[public-landing] failed to load featured previews:", error);
      return res.status(500).json({
        message: "Failed to load featured previews.",
      });
    }
  },

  async getPreviewAsset(req: Request, res: Response) {
    try {
      const previewId = parseId(req.params["previewId"]);

      if (!previewId) {
        return res.status(400).json({
          message: "Invalid preview id.",
        });
      }

      const { absolutePath, mimeType } =
        await publicLandingPreviewService.getPreviewAbsolutePath(previewId);

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
