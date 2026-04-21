import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";

export type GameHistoryItem =
  | {
      type: "round";
      id: `round:${number}`;
      createdAt: string;
      roundNumber: number;
      data: RoundSummaryData;
    }
  | {
      type: "game";
      id: `game:${number}:${string}`;
      createdAt: string;
      data: GameSummaryData;
    };

export interface CanvasHistoryResponse {
  rounds: RoundSummaryData[];
  gameSummary: GameSummaryData | null;
}

export function getRoundHistoryItemId(roundId: number): `round:${number}` {
  return `round:${roundId}`;
}

export function getGameHistoryItemId(
  canvasId: number,
  endedAt: string | null,
): `game:${number}:${string}` {
  return `game:${canvasId}:${endedAt ?? "ended"}`;
}
