import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { GameSummary } from "../../entities/game-summary.entity";
import { RoundSnapshot } from "../../entities/round-snapshot.entity";
import { VoteRound } from "../../entities/vote-round.entity";

const canvasRepository = AppDataSource.getRepository(Canvas);
const gameSummaryRepository = AppDataSource.getRepository(GameSummary);
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

function buildRoundSnapshotApiPath(canvasId: number, roundId: number): string {
  return `/canvas/${canvasId}/rounds/${roundId}/snapshot`;
}

function buildRoundDownloadSnapshotApiPath(
  canvasId: number,
  roundId: number,
): string {
  return `/canvas/${canvasId}/rounds/${roundId}/download-snapshot`;
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
  round: VoteRound,
  snapshot: RoundSnapshot | null,
  snapshotUrl: string | null,
) {
  const roundId = getEntityId(round) ?? 0;
  const roundNumber = getNumberField(round, "roundNumber") ?? 0;
  const startedAt = getDateStringField(round, "startedAt");
  const endedAt = getDateStringField(round, "endedAt");

  return {
    roundId,
    roundNumber,
    startedAt,
    endedAt,
    phaseStartedAt: startedAt,
    phaseEndedAt: endedAt,
    snapshot: serializeSnapshot(snapshot, snapshotUrl),
    snapshotUrl,
    totalVotes: getNumberField(round, "totalVotes") ?? 0,
    winnerColor: getStringField(round, "winnerColor"),
    colorStats: toRecord(round).colorStats ?? [],
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
    roundId,
    roundNumber,
    startedAt: null,
    endedAt: createdAt,
    phaseStartedAt: null,
    phaseEndedAt: createdAt,
    snapshot: serializeSnapshot(snapshot, snapshotUrl),
    snapshotUrl,
    totalVotes: 0,
    winnerColor: null,
    colorStats: [],
  };
}

function serializeGameSummary(
  canvas: Canvas,
  rounds: VoteRound[],
  summary: GameSummary | null,
  snapshotUrl: string | null,
  downloadSnapshotUrl: string | null,
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

    const [rounds, snapshots, gameSummary] = await Promise.all([
      voteRoundRepository.find({
        where: {
          canvas: { id: canvasId },
        },
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

    const historyRounds = snapshots.map((snapshot) => {
        const round = getRoundForSnapshot(snapshot, roundMap);
        const snapshotUrl = getRoundSnapshotUrl(canvasId, snapshot, roundMap);

        if (!round) {
          return serializeRoundSummaryFromSnapshot(snapshot, snapshotUrl);
        }

        return serializeRoundSummary(round, snapshot, snapshotUrl);
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

    return {
      rounds: historyRounds,
      gameSummary: getDateStringField(canvas, "endedAt")
        ? serializeGameSummary(
            canvas,
            rounds,
            gameSummary,
            latestSnapshotUrl,
            latestDownloadSnapshotUrl,
          )
        : null,
    };
  },
};
