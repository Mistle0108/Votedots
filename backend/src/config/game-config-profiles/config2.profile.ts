import type { GameConfigUpdate } from "../game-config.types";

export const config2GameConfigProfile: GameConfigUpdate = {
  phases: {
    introPhaseSec: 0,
    roundStartWaitSec: 0,
    roundDurationSec: 120,
    roundResultDelaySec: 30,
    gameEndWaitSec: 600,
    restartDelaySec: 5,
  },
  rules: {
    totalRounds: 20,
    votesPerRound: 2,
    participantGracePeriodSec: 15,
  },
  board: {
    gridSizeX: 40,
    gridSizeY: 40,
    cellSize: 10,
  },
};
