import type { GameConfigUpdate } from "../game-config.types";

export const defaultGameConfigProfile: GameConfigUpdate = {
  board: {
    gridSizeX: 100,
    gridSizeY: 100,
    cellSize: 30,
  },
};
