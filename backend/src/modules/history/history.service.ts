import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { RoundSnapshot } from "../../entities/round-snapshot.entity";
import { VoteRound } from "../../entities/vote-round.entity";

const canvasRepository = AppDataSource.getRepository(Canvas);
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

function serializeSnapshot(snapshot: RoundSnapshot | null) {
  if (!snapshot) {
    return null;
  }

  const imageUrl =
    getStringField(snapshot, "imageUrl") ??
    getStringField(snapshot, "snapshotUrl") ??
    getStringField(snapshot, "publicUrl") ??
    getStringField(snapshot, "url") ??
    getStringField(snapshot, "relativePath");

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
    snapshot: serializeSnapshot(snapshot),
    totalVotes: getNumberField(round, "totalVotes") ?? 0,
    winnerColor: getStringField(round, "winnerColor"),
    colorStats: toRecord(round).colorStats ?? [],
  };
}
function serializeRoundSummaryFromSnapshot(snapshot: RoundSnapshot) {
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
    snapshot: serializeSnapshot(snapshot),
    totalVotes: 0,
    winnerColor: null,
    colorStats: [],
  };
}

function serializeGameSummary(canvas: Canvas, rounds: VoteRound[]) {
  const endedAt = getDateStringField(canvas, "endedAt");

  return {
    canvasId: getEntityId(canvas) ?? 0,
    startedAt: getDateStringField(canvas, "startedAt"),
    endedAt,
    totalRounds:
      getNumberField(canvas, "totalRounds") ??
      getNumberField(canvas, "currentRoundNumber") ??
      rounds.length,
    roundCount: rounds.length,
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

    const rounds = await voteRoundRepository.find({
      where: {
        canvas: { id: canvasId },
      },
      order: {
        roundNumber: "DESC",
      },
    });

    const snapshots = await roundSnapshotRepository.find({
      where: {
        canvas: { id: canvasId },
      },
      order: {
        roundNumber: "DESC",
      },
    });

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
      const snapshotKey = getRoundSnapshotKey(snapshot);
      const fallbackKey = `number:${getNumberField(snapshot, "roundNumber") ?? 0}`;
      const round =
        (snapshotKey ? roundMap.get(snapshotKey) : null) ??
        roundMap.get(fallbackKey) ??
        null;

      if (!round) {
        return serializeRoundSummaryFromSnapshot(snapshot);
      }

      return serializeRoundSummary(round, snapshot);
    });

    return {
      rounds: historyRounds,
      gameSummary: getDateStringField(canvas, "endedAt")
        ? serializeGameSummary(canvas, rounds)
        : null,
    };
  },
};
