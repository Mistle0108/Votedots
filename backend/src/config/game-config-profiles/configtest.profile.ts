import type { GameConfigUpdate } from "../game-config.types";

export const testGameConfigProfile: GameConfigUpdate = {
  phases: {
    introPhaseSec: 2,
    roundStartWaitSec: 2,
    roundDurationSec: 2,
    roundResultDelaySec: 2,
    gameEndWaitSec: 2,
    restartDelaySec: 4,
  },
  rules: {
    totalRounds: 2,
    votesPerRound: 10,
    participantGracePeriodSec: 15,
  },
  board: {
    gridSizeX: 30,
    gridSizeY: 30,
    cellSize: 50,
  },
};
