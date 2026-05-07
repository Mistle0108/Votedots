import type { GameConfigUpdate } from "../game-config.types";

export const config32GameConfigProfile: GameConfigUpdate = {
  board: {
    gridSizeX: 32,
    gridSizeY: 32,
    cellSize: 30,
  },
  rules: {
    votesPerRound: 50,
  },
};
