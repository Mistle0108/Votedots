import type { Request, Response } from "express";
import { finalResultImageService } from "../history/final-result-image.service";
import { historyService } from "../history/history.service";
import { mypageService } from "./mypage.service";

function parsePositiveInteger(value: unknown): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== "string") {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function serializeParticipationItem(
  item: Awaited<ReturnType<typeof mypageService.getParticipationList>>["items"][number],
) {
  return {
    canvasId: item.canvasId,
    gridX: item.participation.gridX,
    gridY: item.participation.gridY,
    size: `${item.participation.gridX}x${item.participation.gridY}`,
    endedAt: item.participation.endedAt.toISOString(),
    participatedAt: item.participation.lastVotedAt.toISOString(),
    usedVoteCount: item.participation.usedVoteCount,
    isTopVoter: item.participation.isTopVoter,
    resultImageUrl: item.gameSummary?.finalResultStoragePath
      ? finalResultImageService.buildFinalResultImageApiPath(item.canvasId)
      : null,
  };
}

export const mypageController = {
  async getParticipations(req: Request, res: Response) {
    try {
      const voterId = req.session.voter?.id;

      if (!voterId) {
        return res.status(401).json({ message: "AUTH_REQUIRED_LOGIN" });
      }

      const page = parsePositiveInteger(req.query["page"]) ?? undefined;
      const limit = parsePositiveInteger(req.query["limit"]) ?? undefined;
      const size =
        typeof req.query["size"] === "string" ? req.query["size"] : null;
      const visibility =
        typeof req.query["visibility"] === "string"
          ? req.query["visibility"]
          : null;

      const result = await mypageService.getParticipationList({
        voterId,
        page,
        limit,
        size,
        visibility,
      });

      return res.json({
        items: result.items.map(serializeParticipationItem),
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(400).json({ message: String(error) });
    }
  },

  async getParticipationDetail(req: Request, res: Response) {
    try {
      const voterId = req.session.voter?.id;
      const canvasId = parsePositiveInteger(req.params["canvasId"]);

      if (!voterId) {
        return res.status(401).json({ message: "AUTH_REQUIRED_LOGIN" });
      }

      if (!canvasId) {
        return res.status(400).json({ message: "INVALID_CANVAS_ID" });
      }

      const result = await mypageService.getParticipationDetail(voterId, canvasId);

      if (!result || !result.gameSummary) {
        return res.status(404).json({ message: "MYPAGE_PARTICIPATION_NOT_FOUND" });
      }

      const imageUrl = result.gameSummary.finalResultStoragePath
        ? finalResultImageService.buildFinalResultImageApiPath(canvasId)
        : null;
      const history = await historyService.getCanvasHistory(canvasId);
      const gameSummaryDownloads = history?.gameSummary;

      return res.json({
        participation: {
          canvasId,
          gridX: result.participation.gridX,
          gridY: result.participation.gridY,
          size: `${result.participation.gridX}x${result.participation.gridY}`,
          endedAt: result.participation.endedAt.toISOString(),
          participatedAt: result.participation.lastVotedAt.toISOString(),
          usedVoteCount: result.participation.usedVoteCount,
          isTopVoter: result.participation.isTopVoter,
          totalRounds: result.gameSummary.totalRounds,
          participantCount: result.gameSummary.participantCount,
          totalVotes: result.gameSummary.totalVotes,
          canvasCompletionPercent: result.gameSummary.canvasCompletionPercent,
          topVoterName: result.gameSummary.topVoterName,
          topVoterVoteCount: result.gameSummary.topVoterVoteCount,
          hottestRoundNumber: result.gameSummary.hottestRoundNumber,
          hottestRoundVoteCount: result.gameSummary.hottestRoundVoteCount,
          participants: (result.gameSummary.participantsJson ?? []).map(
            (participant) => participant.name,
          ),
          resultImageUrl: imageUrl,
          downloadSnapshotUrl: gameSummaryDownloads?.downloadSnapshotUrl ?? null,
          highResolutionDownloadSnapshotUrl:
            gameSummaryDownloads?.highResolutionDownloadSnapshotUrl ?? null,
          downloadAvailable: Boolean(gameSummaryDownloads?.downloadSnapshotUrl),
          highResolutionDownloadAvailable: Boolean(
            gameSummaryDownloads?.highResolutionDownloadSnapshotUrl,
          ),
          createdAt: result.gameSummary.createdAt.toISOString(),
          updatedAt: result.gameSummary.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      return res.status(400).json({ message: String(error) });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const voterId = req.session.voter?.id;

      if (!voterId) {
        return res.status(401).json({ message: "AUTH_REQUIRED_LOGIN" });
      }

      const stats = await mypageService.getStats(voterId);

      return res.json({
        stats,
      });
    } catch (error) {
      return res.status(400).json({ message: String(error) });
    }
  },
};
