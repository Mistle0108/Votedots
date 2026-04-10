import * as dotenv from "dotenv";

dotenv.config();

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

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = parseInt(String(process.env[name] ?? ""), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readNonNegativeIntegerEnv(name: string, fallback: number): number {
  const value = parseInt(String(process.env[name] ?? ""), 10);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

const overrides: GameConfigUpdate = {};

function resolvePhases(): GamePhaseConfig {
  return {
    introPhaseSec:
      overrides.phases?.introPhaseSec ??
      readNonNegativeIntegerEnv("INTRO_PHASE_SEC", 0),
    roundStartWaitSec:
      overrides.phases?.roundStartWaitSec ??
      readNonNegativeIntegerEnv("ROUND_START_WAIT_SEC", 5),
    roundDurationSec:
      overrides.phases?.roundDurationSec ??
      readPositiveIntegerEnv("ROUND_DURATION_SEC", 20),
    roundResultDelaySec:
      overrides.phases?.roundResultDelaySec ??
      readNonNegativeIntegerEnv("ROUND_RESULT_DELAY_SEC", 3),
    gameEndWaitSec:
      overrides.phases?.gameEndWaitSec ??
      readNonNegativeIntegerEnv("GAME_END_WAIT_SEC", 5),
    restartDelaySec:
      overrides.phases?.restartDelaySec ??
      readNonNegativeIntegerEnv("RESTART_DELAY_SEC", 3),
  };
}

function resolveRules(): GameRuleConfig {
  return {
    totalRounds:
      overrides.rules?.totalRounds ??
      readPositiveIntegerEnv("TOTAL_ROUNDS", 10),
    votesPerRound:
      overrides.rules?.votesPerRound ??
      readPositiveIntegerEnv("VOTES_PER_ROUND", 3),
    participantGracePeriodSec:
      overrides.rules?.participantGracePeriodSec ??
      readNonNegativeIntegerEnv("PARTICIPANT_GRACE_PERIOD_SEC", 15),
  };
}

function resolveBoard(): GameBoardConfig {
  return {
    gridSizeX:
      overrides.board?.gridSizeX ?? readPositiveIntegerEnv("GRID_SIZE_X", 25),
    gridSizeY:
      overrides.board?.gridSizeY ?? readPositiveIntegerEnv("GRID_SIZE_Y", 25),
    cellSize:
      overrides.board?.cellSize ?? readPositiveIntegerEnv("CELL_SIZE", 8),
  };
}

function resolveGameConfig(): GameConfigSnapshot {
  return {
    phases: resolvePhases(),
    rules: resolveRules(),
    board: resolveBoard(),
  };
}

export const gameConfig = {
  get phases(): GamePhaseConfig {
    return resolvePhases();
  },

  get rules(): GameRuleConfig {
    return resolveRules();
  },

  get board(): GameBoardConfig {
    return resolveBoard();
  },

  get introPhaseSec(): number {
    return this.phases.introPhaseSec;
  },

  get roundStartWaitSec(): number {
    return this.phases.roundStartWaitSec;
  },

  get roundDurationSec(): number {
    return this.phases.roundDurationSec;
  },

  get roundResultDelaySec(): number {
    return this.phases.roundResultDelaySec;
  },

  get gameEndWaitSec(): number {
    return this.phases.gameEndWaitSec;
  },

  get restartDelaySec(): number {
    return this.phases.restartDelaySec;
  },

  get totalRounds(): number {
    return this.rules.totalRounds;
  },

  get votesPerRound(): number {
    return this.rules.votesPerRound;
  },

  get participantGracePeriodSec(): number {
    return this.rules.participantGracePeriodSec;
  },

  get gridSizeX(): number {
    return this.board.gridSizeX;
  },

  get gridSizeY(): number {
    return this.board.gridSizeY;
  },

  get cellSize(): number {
    return this.board.cellSize;
  },

  get totalDurationSec(): number {
    return (
      this.introPhaseSec +
      this.totalRounds *
        (this.roundStartWaitSec +
          this.roundDurationSec +
          this.roundResultDelaySec) +
      this.gameEndWaitSec
    );
  },
};

export function getGameConfigSnapshot(): GameConfigSnapshot {
  return resolveGameConfig();
}

export function updateGameConfig(config: GameConfigUpdate): void {
  if (config.phases) {
    overrides.phases = {
      ...overrides.phases,
      ...config.phases,
    };
  }

  if (config.rules) {
    overrides.rules = {
      ...overrides.rules,
      ...config.rules,
    };
  }

  if (config.board) {
    overrides.board = {
      ...overrides.board,
      ...config.board,
    };
  }
}
