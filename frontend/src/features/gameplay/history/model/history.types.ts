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
      id: `game:${number}`;
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
): `game:${number}` {
  return `game:${canvasId}`;
}
