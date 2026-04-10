import type { GameConfigUpdate } from "../game-config.types";
import { config1GameConfigProfile } from "./config1.profile";
import { config2GameConfigProfile } from "./config2.profile";
import { defaultGameConfigProfile } from "./default.profile";

export const GAME_CONFIG_PROFILES: Record<string, GameConfigUpdate> = {
  default: defaultGameConfigProfile,
  config1: config1GameConfigProfile,
  config2: config2GameConfigProfile,
};
