import type { Request, Response } from "express";
import { historyService } from "./history.service";

function parseCanvasId(value: unknown): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== "string") {
    return null;
  }

  const canvasId = Number(rawValue);

  if (!Number.isInteger(canvasId) || canvasId <= 0) {
    return null;
  }

  return canvasId;
}

function toAbsoluteUrl(req: Request, url: string | null) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const host = req.get("host");

  return host ? `${req.protocol}://${host}${url}` : url;
}

export const historyController = {
  async getCanvasHistory(req: Request, res: Response) {
    const canvasId = parseCanvasId(req.params.canvasId);

    if (!canvasId) {
      return res.status(400).json({
        message: "canvasId가 올바르지 않습니다.",
      });
    }

    const history = await historyService.getCanvasHistory(canvasId);

    if (!history) {
      return res.status(404).json({
        message: "캔버스를 찾을 수 없습니다.",
      });
    }

    return res.json({
      ...history,
      rounds: history.rounds.map((round) => ({
        ...round,
        snapshotUrl: toAbsoluteUrl(req, round.snapshotUrl),
        snapshot: round.snapshot
          ? {
              ...round.snapshot,
              imageUrl: toAbsoluteUrl(req, round.snapshot.imageUrl),
              snapshotUrl: toAbsoluteUrl(req, round.snapshot.snapshotUrl),
            }
          : null,
      })),
      gameSummary: history.gameSummary
        ? {
            ...history.gameSummary,
            snapshotUrl: toAbsoluteUrl(req, history.gameSummary.snapshotUrl),
            downloadSnapshotUrl: toAbsoluteUrl(
              req,
              history.gameSummary.downloadSnapshotUrl,
            ),
            highResolutionDownloadSnapshotUrl: toAbsoluteUrl(
              req,
              history.gameSummary.highResolutionDownloadSnapshotUrl,
            ),
          }
        : null,
    });
  },
};
