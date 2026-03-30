import type { Cell } from "@/features/gameplay/canvas";
import type {
  RoundInfo as RoundData,
  RoundTimer,
} from "@/features/gameplay/round/model/round.types";

export interface SessionBootstrapResult {
  canvasId: number;
  gridX: number;
  gridY: number;
  cells: Cell[];
  round: RoundData | null;
  timer: RoundTimer | null;
  remaining: number | null;
}
