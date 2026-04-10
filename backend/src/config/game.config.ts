import * as dotenv from "dotenv";
import { GAME_CONFIG_PROFILES } from "./game-config-profiles";
import type {
  CanvasGameConfigSource,
  GameBoardConfig,
  GameConfigProfileSummary,
  GameConfigSnapshot,
  GameConfigUpdate,
  GamePhaseConfig,
  GameRuleConfig,
} from "./game-config.types";

dotenv.config();

export type {
  CanvasGameConfigSource,
  GameBoardConfig,
  GameConfigProfileSummary,
  GameConfigSnapshot,
  GameConfigUpdate,
  GamePhaseConfig,
  GameRuleConfig,
} from "./game-config.types";

const DEFAULT_PROFILE_KEY = "default";

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = parseInt(String(process.env[name] ?? ""), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readNonNegativeIntegerEnv(name: string, fallback: number): number {
  const value = parseInt(String(process.env[name] ?? ""), 10);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function cloneGameConfigSnapshot(
  config: GameConfigSnapshot,
): GameConfigSnapshot {
  return {
    phases: { ...config.phases },
    rules: { ...config.rules },
    board: { ...config.board },
  };
}

function mergeGameConfig(
  base: GameConfigSnapshot,
  update?: GameConfigUpdate,
): GameConfigSnapshot {
  if (!update) {
    return cloneGameConfigSnapshot(base);
  }

  return {
    phases: {
      ...base.phases,
      ...update.phases,
    },
    rules: {
      ...base.rules,
      ...update.rules,
    },
    board: {
      ...base.board,
      ...update.board,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberRecord(
  value: unknown,
  keys: string[],
  { allowZero = true }: { allowZero?: boolean } = {},
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return keys.every((key) => {
    const field = value[key];
    return (
      typeof field === "number" &&
      Number.isFinite(field) &&
      (allowZero ? field >= 0 : field > 0)
    );
  });
}

function isGameConfigSnapshot(value: unknown): value is GameConfigSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumberRecord(
      value.phases,
      [
        "introPhaseSec",
        "roundStartWaitSec",
        "roundDurationSec",
        "roundResultDelaySec",
        "gameEndWaitSec",
        "restartDelaySec",
      ],
      { allowZero: true },
    ) &&
    isNumberRecord(
      value.rules,
      ["totalRounds", "votesPerRound", "participantGracePeriodSec"],
      { allowZero: false },
    ) &&
    isNumberRecord(value.board, ["gridSizeX", "gridSizeY", "cellSize"], {
      allowZero: false,
    })
  );
}

const overrides: GameConfigUpdate = {};

function resolveEnvPhases(): GamePhaseConfig {
  return {
    introPhaseSec: readNonNegativeIntegerEnv("INTRO_PHASE_SEC", 0),
    roundStartWaitSec: readNonNegativeIntegerEnv("ROUND_START_WAIT_SEC", 5),
    roundDurationSec: readPositiveIntegerEnv("ROUND_DURATION_SEC", 20),
    roundResultDelaySec: readNonNegativeIntegerEnv("ROUND_RESULT_DELAY_SEC", 3),
    gameEndWaitSec: readNonNegativeIntegerEnv("GAME_END_WAIT_SEC", 5),
    restartDelaySec: readNonNegativeIntegerEnv("RESTART_DELAY_SEC", 3),
  };
}

function resolveEnvRules(): GameRuleConfig {
  return {
    totalRounds: readPositiveIntegerEnv("TOTAL_ROUNDS", 10),
    votesPerRound: readPositiveIntegerEnv("VOTES_PER_ROUND", 3),
    participantGracePeriodSec: readNonNegativeIntegerEnv(
      "PARTICIPANT_GRACE_PERIOD_SEC",
      15,
    ),
  };
}

function resolveEnvBoard(): GameBoardConfig {
  return {
    gridSizeX: readPositiveIntegerEnv("GRID_SIZE_X", 25),
    gridSizeY: readPositiveIntegerEnv("GRID_SIZE_Y", 25),
    cellSize: readPositiveIntegerEnv("CELL_SIZE", 8),
  };
}

function resolveEnvGameConfig(): GameConfigSnapshot {
  return {
    phases: resolveEnvPhases(),
    rules: resolveEnvRules(),
    board: resolveEnvBoard(),
  };
}

export function getGameConfigProfileKeys(): string[] {
  return Object.keys(GAME_CONFIG_PROFILES);
}

export function hasGameConfigProfile(profileKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(GAME_CONFIG_PROFILES, profileKey);
}

function getDefaultProfileKey(): string {
  const configured = String(
    process.env.DEFAULT_GAME_CONFIG_PROFILE_KEY ?? DEFAULT_PROFILE_KEY,
  ).trim();

  if (configured && hasGameConfigProfile(configured)) {
    return configured;
  }

  return DEFAULT_PROFILE_KEY;
}

export function resolveGameConfigProfileKey(
  profileKey?: string | null,
): string {
  const requested = profileKey?.trim();

  if (requested) {
    if (!hasGameConfigProfile(requested)) {
      throw new Error(
        `Unknown game config profile: ${requested}. Available profiles: ${getGameConfigProfileKeys().join(", ")}`,
      );
    }

    return requested;
  }

  return getDefaultProfileKey();
}

function resolveGameConfig(profileKey?: string | null): GameConfigSnapshot {
  const resolvedProfileKey = resolveGameConfigProfileKey(profileKey);
  const envConfig = resolveEnvGameConfig();
  const profileConfig = GAME_CONFIG_PROFILES[resolvedProfileKey];

  return mergeGameConfig(mergeGameConfig(envConfig, profileConfig), overrides);
}

function normalizeBoardSnapshot(
  baseSnapshot: GameConfigSnapshot,
  source?: CanvasGameConfigSource | null,
): GameConfigSnapshot {
  if (!source) {
    return baseSnapshot;
  }

  return {
    ...baseSnapshot,
    board: {
      ...baseSnapshot.board,
      gridSizeX:
        typeof source.gridX === "number" && source.gridX > 0
          ? source.gridX
          : baseSnapshot.board.gridSizeX,
      gridSizeY:
        typeof source.gridY === "number" && source.gridY > 0
          ? source.gridY
          : baseSnapshot.board.gridSizeY,
    },
  };
}

export const gameConfig = {
  get phases(): GamePhaseConfig {
    return resolveGameConfig().phases;
  },

  get rules(): GameRuleConfig {
    return resolveGameConfig().rules;
  },

  get board(): GameBoardConfig {
    return resolveGameConfig().board;
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

export function getGameConfigSnapshot(
  profileKey?: string | null,
): GameConfigSnapshot {
  return resolveGameConfig(profileKey);
}

export function createCanvasGameConfig(profileKey?: string | null): {
  profileKey: string;
  snapshot: GameConfigSnapshot;
} {
  const resolvedProfileKey = resolveGameConfigProfileKey(profileKey);

  return {
    profileKey: resolvedProfileKey,
    snapshot: getGameConfigSnapshot(resolvedProfileKey),
  };
}

export function getCanvasGameConfigSnapshot(
  source?: CanvasGameConfigSource | null,
): GameConfigSnapshot {
  const profileKey = source?.configProfileKey?.trim();

  let baseSnapshot: GameConfigSnapshot;

  try {
    baseSnapshot = getGameConfigSnapshot(profileKey);
  } catch {
    baseSnapshot = getGameConfigSnapshot();
  }

  if (!source) {
    return baseSnapshot;
  }

  if (!isGameConfigSnapshot(source.configSnapshot)) {
    return normalizeBoardSnapshot(baseSnapshot, source);
  }

  return normalizeBoardSnapshot(source.configSnapshot, source);
}

export function getGameConfigProfiles(): GameConfigProfileSummary[] {
  return getGameConfigProfileKeys().map((key) => ({
    key,
    snapshot: getGameConfigSnapshot(key),
  }));
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
