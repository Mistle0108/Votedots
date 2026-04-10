export interface GameConfig {
  phases: {
    introPhaseSec: number;
    roundStartWaitSec: number;
    roundDurationSec: number;
    roundResultDelaySec: number;
    gameEndWaitSec: number;
    restartDelaySec: number;
  };
  rules: {
    totalRounds: number;
    votesPerRound: number;
    participantGracePeriodSec: number;
  };
  board: {
    gridSizeX: number;
    gridSizeY: number;
    cellSize: number;
  };
}

const DEFAULT_GAME_CONFIG: GameConfig = {
  phases: {
    introPhaseSec: 0,
    roundStartWaitSec: 5,
    roundDurationSec: 20,
    roundResultDelaySec: 3,
    gameEndWaitSec: 5,
    restartDelaySec: 3,
  },
  rules: {
    totalRounds: 10,
    votesPerRound: 3,
    participantGracePeriodSec: 15,
  },
  board: {
    gridSizeX: 25,
    gridSizeY: 25,
    cellSize: 8,
  },
};

function cloneGameConfig(config: GameConfig): GameConfig {
  return {
    phases: { ...config.phases },
    rules: { ...config.rules },
    board: { ...config.board },
  };
}

let currentGameConfig: GameConfig = cloneGameConfig(DEFAULT_GAME_CONFIG);

export function getGameConfig(): GameConfig {
  return currentGameConfig;
}

export function setGameConfig(config: GameConfig): void {
  currentGameConfig = cloneGameConfig(config);
}
