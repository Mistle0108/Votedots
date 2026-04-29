import type { GameConfigUpdate } from "../game-config.types";
import { config1GameConfigProfile } from "./config1.profile";
import { config1024GameConfigProfile } from "./config1024.profile";
import { config2GameConfigProfile } from "./config2.profile";
import { config128GameConfigProfile } from "./config128.profile";
import { config256GameConfigProfile } from "./config256.profile";
import { config32GameConfigProfile } from "./config32.profile";
import { config512GameConfigProfile } from "./config512.profile";
import { config64GameConfigProfile } from "./config64.profile";
import { defaultGameConfigProfile } from "./default.profile";
import { testGameConfigProfile } from "./configtest.profile";

export const GAME_CONFIG_PROFILES: Record<string, GameConfigUpdate> = {
  default: defaultGameConfigProfile,
  config32: config32GameConfigProfile,
  config64: config64GameConfigProfile,
  config128: config128GameConfigProfile,
  config256: config256GameConfigProfile,
  config512: config512GameConfigProfile,
  config1024: config1024GameConfigProfile,
  config1: config1GameConfigProfile,
  config2: config2GameConfigProfile,
  test: testGameConfigProfile,
};
