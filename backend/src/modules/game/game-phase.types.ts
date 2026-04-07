export enum GamePhase {
  ROUND_START_WAIT = "round_start_wait",
  ROUND_ACTIVE = "round_active",
  ROUND_RESULT = "round_result",
  GAME_END = "game_end",
}

export const GAME_PHASE_VALUES = Object.values(GamePhase);

export interface GamePhaseState {
  phase: GamePhase;
  phaseStartedAt: Date;
  phaseEndsAt: Date | null;
  currentRoundNumber: number;
}
