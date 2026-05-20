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

function parseDateRange(raw: unknown): Date | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePositiveInteger(
  raw: unknown,
  options: { defaultValue: number; max?: number },
): number | null {
  if (typeof raw === "undefined") {
    return options.defaultValue;
  }

  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  if (options.max && parsed > options.max) {
    return options.max;
  }

  return parsed;
}

function parseCompletedSort(raw: unknown): "latest" | "oldest" | null {
  if (typeof raw === "undefined") {
    return "latest";
  }

  if (raw === "latest" || raw === "oldest") {
    return raw;
  }

  return null;
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

  async getCompletedPreviews(req: Request, res: Response) {
    try {
      const scope =
        req.query["scope"] === "public" || req.query["scope"] === "plaza"
          ? req.query["scope"]
          : null;
      const dateFrom = parseDateRange(req.query["dateFrom"]);
      const dateTo = parseDateRange(req.query["dateTo"]);
      const page = parsePositiveInteger(req.query["page"], {
        defaultValue: 1,
      });
      const limit = parsePositiveInteger(req.query["limit"], {
        defaultValue: 24,
        max: 24,
      });
      const sort = parseCompletedSort(req.query["sort"]);

      if (!scope || !dateFrom || !dateTo || !page || !limit || !sort) {
        return res.status(400).json({
          message: "Invalid completed preview filters.",
        });
      }

      const payload = await publicLandingService.getCompletedPreviews({
        scope,
        dateFrom,
        dateTo,
        page,
        limit,
        sort,
      });

      res.setHeader("Cache-Control", "no-store");
      return res.json(payload);
    } catch (error) {
      console.error("[public-landing] failed to load completed previews:", error);
      return res.status(500).json({
        message: "Failed to load completed previews.",
      });
    }
  },

  async getCompletedPreviewDetail(req: Request, res: Response) {
    try {
      const canvasId = parseId(req.params["canvasId"]);

      if (!canvasId) {
        return res.status(400).json({
          message: "Invalid canvas id.",
        });
      }

      const payload = await publicLandingService.getCompletedPreviewDetail(
        canvasId,
      );

      if (!payload) {
        return res.status(404).json({
          message: "Completed canvas detail was not found.",
        });
      }

      res.setHeader("Cache-Control", "no-store");
      return res.json(payload);
    } catch (error) {
      console.error("[public-landing] failed to load completed preview detail:", error);
      return res.status(500).json({
        message: "Failed to load completed preview detail.",
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
