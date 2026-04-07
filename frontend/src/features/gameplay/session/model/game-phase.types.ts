export type GamePhase =
  | "round_start_wait"
  | "round_active"
  | "round_result"
  | "game_end";

export const GAME_PHASE = {
  ROUND_START_WAIT: "round_start_wait",
  ROUND_ACTIVE: "round_active",
  ROUND_RESULT: "round_result",
  GAME_END: "game_end",
} as const;

export function isRoundActivePhase(phase: GamePhase): boolean {
  return phase === GAME_PHASE.ROUND_ACTIVE;
}
