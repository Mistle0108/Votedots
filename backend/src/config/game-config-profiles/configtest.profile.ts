import type { GameConfigUpdate } from "../game-config.types";

export const testGameConfigProfile: GameConfigUpdate = {
  phases: {
    introPhaseSec: 2,
    roundStartWaitSec: 2,
    roundDurationSec: 5,
    roundResultDelaySec: 2,
    gameEndWaitSec: 20,
    restartDelaySec: 3,
  },
  rules: {
    totalRounds: 2,
    votesPerRound: 10,
    participantGracePeriodSec: 15,
  },
  board: {
    gridSizeX: 32,
    gridSizeY: 32,
    cellSize: 30,
  },
};
