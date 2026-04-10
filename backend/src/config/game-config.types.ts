export interface GamePhaseConfig {
  introPhaseSec: number;
  roundStartWaitSec: number;
  roundDurationSec: number;
  roundResultDelaySec: number;
  gameEndWaitSec: number;
  restartDelaySec: number;
}

export interface GameRuleConfig {
  totalRounds: number;
  votesPerRound: number;
  participantGracePeriodSec: number;
}

export interface GameBoardConfig {
  gridSizeX: number;
  gridSizeY: number;
  cellSize: number;
}

export interface GameConfigSnapshot {
  phases: GamePhaseConfig;
  rules: GameRuleConfig;
  board: GameBoardConfig;
}

export interface GameConfigUpdate {
  phases?: Partial<GamePhaseConfig>;
  rules?: Partial<GameRuleConfig>;
  board?: Partial<GameBoardConfig>;
}

export interface GameConfigProfileSummary {
  key: string;
  snapshot: GameConfigSnapshot;
}

export interface CanvasGameConfigSource {
  gridX?: number | null;
  gridY?: number | null;
  configProfileKey?: string | null;
  configSnapshot?: unknown;
}
