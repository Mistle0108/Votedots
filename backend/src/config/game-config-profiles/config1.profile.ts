import type { GameConfigUpdate } from "../game-config.types";

export const config1GameConfigProfile: GameConfigUpdate = {
  phases: {
    introPhaseSec: 0,
    roundStartWaitSec: 0,
    roundDurationSec: 180,
    roundResultDelaySec: 60,
    gameEndWaitSec: 1200,
    restartDelaySec: 5,
  },
  rules: {
    totalRounds: 25,
    votesPerRound: 3,
    participantGracePeriodSec: 15,
  },
  board: {
    gridSizeX: 50,
    gridSizeY: 50,
    cellSize: 30,
  },
};
