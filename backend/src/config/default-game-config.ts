import type { GameConfigSnapshot } from "./game-config.types";

export const DEFAULT_GAME_CONFIG_SNAPSHOT: GameConfigSnapshot = {
  phases: {
    introPhaseSec: 25,
    roundStartWaitSec: 5,
    roundDurationSec: 60,
    roundResultDelaySec: 10,
    gameEndWaitSec: 275,
    restartDelaySec: 5,
  },
  rules: {
    totalRounds: 10,
    votesPerRound: 50,
    participantGracePeriodSec: 15,
  },
  board: {
    gridSizeX: 32,
    gridSizeY: 32,
    cellSize: 30,
  },
};
