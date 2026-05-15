import type { GameConfigUpdate } from "../game-config.types";

export const defaultGameConfigProfile: GameConfigUpdate = {
  board: {
    gridSizeX: 32,
    gridSizeY: 32,
    cellSize: 30,
  },
};
