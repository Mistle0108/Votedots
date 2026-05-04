import type { GameConfigSnapshot } from "./game-config.types";

export const DEFAULT_GAME_CONFIG_SNAPSHOT: GameConfigSnapshot = {
  phases: {
    introPhaseSec: 10,
    roundStartWaitSec: 1,
    roundDurationSec: 20,
    roundResultDelaySec: 3,
    gameEndWaitSec: 10,
    restartDelaySec: 5,
  },
  rules: {
    totalRounds: 2,
    votesPerRound: 4,
    participantGracePeriodSec: 15,
  },
  board: {
    gridSizeX: 32,
    gridSizeY: 32,
    cellSize: 30,
  },
};
