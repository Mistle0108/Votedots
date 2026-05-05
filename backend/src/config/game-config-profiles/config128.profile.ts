import type { GameConfigUpdate } from "../game-config.types";

export const config128GameConfigProfile: GameConfigUpdate = {
  board: {
    gridSizeX: 128,
    gridSizeY: 128,
    cellSize: 30,
  },
  rules: {
    totalRounds: 20,
  },
};
