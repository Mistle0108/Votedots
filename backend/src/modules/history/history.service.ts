import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { GameSummary } from "../../entities/game-summary.entity";
import { RoundSnapshot } from "../../entities/round-snapshot.entity";
import { RoundSummary } from "../../entities/round-summary.entity";
import { VoteRound } from "../../entities/vote-round.entity";

const canvasRepository = AppDataSource.getRepository(Canvas);
const gameSummaryRepository = AppDataSource.getRepository(GameSummary);
const roundSummaryRepository = AppDataSource.getRepository(RoundSummary);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const roundSnapshotRepository = AppDataSource.getRepository(RoundSnapshot);

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return {};
}

function getNumberField(value: unknown, key: string): number | null {
  const fieldValue = toRecord(value)[key];

  return typeof fieldValue === "number" ? fieldValue : null;
}

function getStringField(value: unknown, key: string): string | null {
  const fieldValue = toRecord(value)[key];

  return typeof fieldValue === "string" ? fieldValue : null;
}

function getDateStringField(value: unknown, key: string): string | null {
  const fieldValue = toRecord(value)[key];

  if (fieldValue instanceof Date) {
    return fieldValue.toISOString();
  }

  return typeof fieldValue === "string" ? fieldValue : null;
}

function getEntityId(value: unknown): number | null {
  return getNumberField(value, "id");
}

function getRelatedEntityId(value: unknown, key: string): number | null {
  return getEntityId(toRecord(value)[key]);
}

function getRoundSnapshotKey(snapshot: RoundSnapshot): string | null {
  const roundId =
    getNumberField(snapshot, "roundId") ??
    getRelatedEntityId(snapshot, "round");

  if (roundId) {
    return `round:${roundId}`;
  }

  const roundNumber = getNumberField(snapshot, "roundNumber");

  if (roundNumber) {
    return `number:${roundNumber}`;
  }

  return null;
}

function getRoundKey(round: VoteRound): string {
  const roundId = getEntityId(round);

  if (roundId) {
    return `round:${roundId}`;
  }

  return `number:${getNumberField(round, "roundNumber") ?? 0}`;
}

function getRoundFallbackKey(round: VoteRound): string {
  return `number:${getNumberField(round, "roundNumber") ?? 0}`;
}

function getRoundSummaryKey(summary: RoundSummary): string | null {
  const roundId =
    getNumberField(summary, "roundId") ??
    getRelatedEntityId(summary, "round");

  if (roundId) {
    return `round:${roundId}`;
  }

  const roundNumber = getNumberField(summary, "roundNumber");

  if (roundNumber) {
    return `number:${roundNumber}`;
  }

  return null;
}

function getRoundForSnapshot(
  snapshot: RoundSnapshot,
  roundMap: Map<string, VoteRound>,
): VoteRound | null {
  const snapshotKey = getRoundSnapshotKey(snapshot);
  const fallbackKey = `number:${getNumberField(snapshot, "roundNumber") ?? 0}`;

  return (
    (snapshotKey ? roundMap.get(snapshotKey) : null) ??
    roundMap.get(fallbackKey) ??
    null
  );
}

function getRoundSummaryForSnapshot(
  snapshot: RoundSnapshot,
  round: VoteRound | null,
  summaryMap: Map<string, RoundSummary>,
): RoundSummary | null {
  const summaryKey =
    (round ? getRoundKey(round) : null) ?? getRoundSnapshotKey(snapshot);
  const fallbackKey = `number:${getNumberField(snapshot, "roundNumber") ?? 0}`;

  return (
    (summaryKey ? summaryMap.get(summaryKey) : null) ??
    summaryMap.get(fallbackKey) ??
    null
  );
}

function buildRoundSnapshotApiPath(canvasId: number, roundId: number): string {
  return `/canvas/${canvasId}/rounds/${roundId}/snapshot`;
}

function buildRoundDownloadSnapshotApiPath(
  canvasId: number,
  roundId: number,
): string {
  return `/canvas/${canvasId}/rounds/${roundId}/download-snapshot`;
}

function buildRoundHighResolutionDownloadSnapshotApiPath(
  canvasId: number,
  roundId: number,
): string {
  return `/canvas/${canvasId}/rounds/${roundId}/download-snapshot-hd`;
}

function getRoundSnapshotUrl(
  canvasId: number,
  snapshot: RoundSnapshot | null,
  roundMap: Map<string, VoteRound>,
): string | null {
  if (!snapshot) {
    return null;
  }

  const round = getRoundForSnapshot(snapshot, roundMap);
  const roundId = round ? getEntityId(round) : null;

  return roundId ? buildRoundSnapshotApiPath(canvasId, roundId) : null;
}

function getRoundDownloadSnapshotUrl(
  canvasId: number,
  snapshot: RoundSnapshot | null,
  roundMap: Map<string, VoteRound>,
): string | null {
  if (!snapshot) {
    return null;
  }

  const round = getRoundForSnapshot(snapshot, roundMap);
  const roundId = round ? getEntityId(round) : null;

  return roundId ? buildRoundDownloadSnapshotApiPath(canvasId, roundId) : null;
}

function getRoundHighResolutionDownloadSnapshotUrl(
  canvasId: number,
  snapshot: RoundSnapshot | null,
  roundMap: Map<string, VoteRound>,
): string | null {
  if (!snapshot) {
    return null;
  }

  const round = getRoundForSnapshot(snapshot, roundMap);
  const roundId = round ? getEntityId(round) : null;

  return roundId
    ? buildRoundHighResolutionDownloadSnapshotApiPath(canvasId, roundId)
    : null;
}

function serializeSnapshot(
  snapshot: RoundSnapshot | null,
  snapshotUrl: string | null,
) {
  if (!snapshot) {
    return null;
  }

  const imageUrl =
    getStringField(snapshot, "imageUrl") ??
    getStringField(snapshot, "snapshotUrl") ??
    getStringField(snapshot, "publicUrl") ??
    getStringField(snapshot, "url") ??
    getStringField(snapshot, "relativePath") ??
    snapshotUrl;

  return {
    id: getEntityId(snapshot),
    roundId:
      getNumberField(snapshot, "roundId") ??
      getRelatedEntityId(snapshot, "round"),
    roundNumber: getNumberField(snapshot, "roundNumber"),
    imageUrl,
    snapshotUrl: imageUrl,
    createdAt:
      getDateStringField(snapshot, "createdAt") ??
      getDateStringField(snapshot, "capturedAt") ??
      new Date().toISOString(),
  };
}

function serializeRoundSummary(
  summary: RoundSummary,
  round: VoteRound | null,
  snapshot: RoundSnapshot | null,
  snapshotUrl: string | null,
) {
  const roundId = getRelatedEntityId(summary, "round") ?? getEntityId(round) ?? 0;
  const roundNumber =
    getNumberField(summary, "roundNumber") ??
    getNumberField(round, "roundNumber") ??
    0;
  const startedAt = round ? getDateStringField(round, "startedAt") : null;
  const endedAt = round ? getDateStringField(round, "endedAt") : null;

  return {
    id: getEntityId(summary) ?? 0,
    canvasId:
      getRelatedEntityId(summary, "canvas") ??
      getRelatedEntityId(round, "canvas") ??
      0,
    roundId,
    roundNumber,
    participantCount: getNumberField(summary, "participantCount") ?? 0,
    totalVotes: getNumberField(summary, "totalVotes") ?? 0,
    paintedCellCount: getNumberField(summary, "paintedCellCount") ?? 0,
    totalCellCount: getNumberField(summary, "totalCellCount") ?? 0,
    currentPaintedCellCount:
      getNumberField(summary, "currentPaintedCellCount") ?? 0,
    canvasProgressPercent:
      getStringField(summary, "canvasProgressPercent") ?? "0.00",
    mostVotedCellId: getNumberField(summary, "mostVotedCellId"),
    mostVotedCellX: getNumberField(summary, "mostVotedCellX"),
    mostVotedCellY: getNumberField(summary, "mostVotedCellY"),
    mostVotedCellVoteCount:
      getNumberField(summary, "mostVotedCellVoteCount") ?? 0,
    randomResolvedCellCount:
      getNumberField(summary, "randomResolvedCellCount") ?? 0,
    startedAt,
    endedAt,
    phaseStartedAt: startedAt,
    phaseEndedAt: endedAt,
    snapshot: serializeSnapshot(snapshot, snapshotUrl),
    snapshotUrl,
    createdAt: getDateStringField(summary, "createdAt") ?? new Date().toISOString(),
    updatedAt: getDateStringField(summary, "updatedAt") ?? new Date().toISOString(),
  };
}

function serializeRoundSummaryFromRound(
  round: VoteRound,
  snapshot: RoundSnapshot | null,
  snapshotUrl: string | null,
) {
  const roundId = getEntityId(round) ?? 0;
  const roundNumber = getNumberField(round, "roundNumber") ?? 0;
  const startedAt = getDateStringField(round, "startedAt");
  const endedAt = getDateStringField(round, "endedAt");

  return {
    id: roundId,
    canvasId: getRelatedEntityId(round, "canvas") ?? 0,
    roundId,
    roundNumber,
    participantCount: 0,
    totalVotes: 0,
    paintedCellCount: 0,
    totalCellCount: 0,
    currentPaintedCellCount: 0,
    canvasProgressPercent: "0.00",
    mostVotedCellId: null,
    mostVotedCellX: null,
    mostVotedCellY: null,
    mostVotedCellVoteCount: 0,
    randomResolvedCellCount: 0,
    startedAt,
    endedAt,
    phaseStartedAt: startedAt,
    phaseEndedAt: endedAt,
    snapshot: serializeSnapshot(snapshot, snapshotUrl),
    snapshotUrl,
    createdAt: endedAt ?? startedAt ?? new Date().toISOString(),
    updatedAt: endedAt ?? startedAt ?? new Date().toISOString(),
  };
}

function serializeRoundSummaryFromSnapshot(
  snapshot: RoundSnapshot,
  snapshotUrl: string | null,
) {
  const roundId =
    getNumberField(snapshot, "roundId") ??
    getRelatedEntityId(snapshot, "round") ??
    getEntityId(snapshot) ??
    0;
  const roundNumber = getNumberField(snapshot, "roundNumber") ?? 0;
  const createdAt =
    getDateStringField(snapshot, "createdAt") ??
    getDateStringField(snapshot, "capturedAt") ??
    new Date().toISOString();

  return {
    id: getEntityId(snapshot) ?? roundId,
    canvasId: getRelatedEntityId(snapshot, "canvas") ?? 0,
    roundId,
    roundNumber,
    participantCount: 0,
    totalVotes: 0,
    paintedCellCount: 0,
    totalCellCount: 0,
    currentPaintedCellCount: 0,
    canvasProgressPercent: "0.00",
    mostVotedCellId: null,
    mostVotedCellX: null,
    mostVotedCellY: null,
    mostVotedCellVoteCount: 0,
    randomResolvedCellCount: 0,
    startedAt: null,
    endedAt: createdAt,
    phaseStartedAt: null,
    phaseEndedAt: createdAt,
    snapshot: serializeSnapshot(snapshot, snapshotUrl),
    snapshotUrl,
    createdAt,
    updatedAt: createdAt,
  };
}

function serializeGameSummary(
  canvas: Canvas,
  rounds: VoteRound[],
  summary: GameSummary | null,
  snapshotUrl: string | null,
  downloadSnapshotUrl: string | null,
  highResolutionDownloadSnapshotUrl: string | null,
) {
  const endedAt = getDateStringField(canvas, "endedAt");
  const totalRounds =
    summary?.totalRounds ??
    getNumberField(canvas, "totalRounds") ??
    getNumberField(canvas, "currentRoundNumber") ??
    rounds.length;

  return {
    canvasId: getEntityId(canvas) ?? 0,
    startedAt: getDateStringField(canvas, "startedAt"),
    endedAt,
    totalRounds,
    roundCount: rounds.length,
    participantCount: summary?.participantCount ?? 0,
    issuedTicketCount: summary?.issuedTicketCount ?? 0,
    totalVotes: summary?.totalVotes ?? 0,
    ticketUsageRate: summary?.ticketUsageRate ?? "0.00",
    totalCellCount: summary?.totalCellCount ?? 0,
    paintedCellCount: summary?.paintedCellCount ?? 0,
    emptyCellCount: summary?.emptyCellCount ?? 0,
    canvasCompletionPercent: summary?.canvasCompletionPercent ?? "0.00",
    mostVotedCellId: summary?.mostVotedCellId ?? null,
    mostVotedCellX: summary?.mostVotedCellX ?? null,
    mostVotedCellY: summary?.mostVotedCellY ?? null,
    mostVotedCellVoteCount: summary?.mostVotedCellVoteCount ?? 0,
    randomResolvedCellCount: summary?.randomResolvedCellCount ?? 0,
    usedColorCount: summary?.usedColorCount ?? 0,
    mostSelectedColor: summary?.mostSelectedColor ?? null,
    mostSelectedColorVoteCount: summary?.mostSelectedColorVoteCount ?? 0,
    mostPaintedColor: summary?.mostPaintedColor ?? null,
    mostPaintedColorCellCount: summary?.mostPaintedColorCellCount ?? 0,
    topVoterId: summary?.topVoterId ?? null,
    topVoterName: summary?.topVoterName ?? null,
    topVoterVoteCount: summary?.topVoterVoteCount ?? 0,
    hottestRoundId: summary?.hottestRoundId ?? null,
    hottestRoundNumber: summary?.hottestRoundNumber ?? null,
    hottestRoundVoteCount: summary?.hottestRoundVoteCount ?? 0,
    topVoters: summary?.topVotersJson ?? null,
    participants: summary?.participantsJson ?? null,
    snapshotUrl,
    downloadSnapshotUrl,
    highResolutionDownloadSnapshotUrl,
    createdAt:
      getDateStringField(summary, "createdAt") ??
      endedAt ??
      new Date().toISOString(),
    updatedAt:
      getDateStringField(summary, "updatedAt") ??
      endedAt ??
      new Date().toISOString(),
  };
}

export const historyService = {
  async getCanvasHistory(canvasId: number) {
    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      return null;
    }

    const [rounds, roundSummaries, snapshots, gameSummary] = await Promise.all([
      voteRoundRepository.find({
        where: {
          canvas: { id: canvasId },
        },
        order: {
          roundNumber: "DESC",
        },
      }),
      roundSummaryRepository.find({
        where: {
          canvas: { id: canvasId },
        },
        relations: ["canvas", "round"],
        order: {
          roundNumber: "DESC",
        },
      }),
      roundSnapshotRepository.find({
        where: {
          canvas: { id: canvasId },
        },
        order: {
          roundNumber: "DESC",
        },
      }),
      gameSummaryRepository.findOne({
        where: { canvas: { id: canvasId } },
        relations: ["canvas"],
      }),
    ]);

    const snapshotMap = new Map<string, RoundSnapshot>();

    for (const snapshot of snapshots) {
      const key = getRoundSnapshotKey(snapshot);

      if (key) {
        snapshotMap.set(key, snapshot);
      }
    }

    const roundMap = new Map<string, VoteRound>();

    for (const round of rounds) {
      roundMap.set(getRoundKey(round), round);
      roundMap.set(getRoundFallbackKey(round), round);
    }

    const roundSummaryMap = new Map<string, RoundSummary>();

    for (const summary of roundSummaries) {
      const key = getRoundSummaryKey(summary);

      if (!key) {
        continue;
      }

      roundSummaryMap.set(key, summary);

      const roundNumber = getNumberField(summary, "roundNumber");

      if (roundNumber) {
        roundSummaryMap.set(`number:${roundNumber}`, summary);
      }
    }

    const historyRounds = snapshots.map((snapshot) => {
        const round = getRoundForSnapshot(snapshot, roundMap);
        const roundSummary = getRoundSummaryForSnapshot(
          snapshot,
          round,
          roundSummaryMap,
        );
        const snapshotUrl = getRoundSnapshotUrl(canvasId, snapshot, roundMap);

        if (roundSummary) {
          return serializeRoundSummary(roundSummary, round, snapshot, snapshotUrl);
        }

        if (round) {
          return serializeRoundSummaryFromRound(round, snapshot, snapshotUrl);
        }

        if (!round) {
          return serializeRoundSummaryFromSnapshot(snapshot, snapshotUrl);
        }

        return serializeRoundSummaryFromSnapshot(snapshot, snapshotUrl);
      });
    const latestSnapshotUrl = getRoundSnapshotUrl(
      canvasId,
      snapshots[0] ?? null,
      roundMap,
    );
    const latestDownloadSnapshotUrl = getRoundDownloadSnapshotUrl(
      canvasId,
      snapshots[0] ?? null,
      roundMap,
    );
    const latestHighResolutionDownloadSnapshotUrl =
      getRoundHighResolutionDownloadSnapshotUrl(
        canvasId,
        snapshots[0] ?? null,
        roundMap,
      );

    return {
      rounds: historyRounds,
      gameSummary: getDateStringField(canvas, "endedAt")
        ? serializeGameSummary(
            canvas,
            rounds,
            gameSummary,
            latestSnapshotUrl,
            latestDownloadSnapshotUrl,
            latestHighResolutionDownloadSnapshotUrl,
          )
        : null,
    };
  },
};
