export const GAME_SIZE_PROFILE_KEYS = [
  "config32",
  "config64",
  "config128",
  "config256",
  "config512",
  "config1024",
] as const;

export type GameSizeRotationProfileKey =
  (typeof GAME_SIZE_PROFILE_KEYS)[number];

export const GAME_SIZE_ROTATION_PROFILE_KEYS = [
  "config32",
  "config64",
  "config128",
  "config256",
] as const satisfies readonly GameSizeRotationProfileKey[];

export const DEFAULT_ROTATION_PROFILE_KEY: GameSizeRotationProfileKey =
  GAME_SIZE_ROTATION_PROFILE_KEYS[0];

export function isGameSizeRotationProfileKey(
  profileKey: string | null | undefined,
): profileKey is GameSizeRotationProfileKey {
  if (!profileKey) {
    return false;
  }

  return GAME_SIZE_PROFILE_KEYS.includes(
    profileKey as GameSizeRotationProfileKey,
  );
}

export function resolveNextGameSizeRotationProfileKey(
  profileKey: string | null | undefined,
): GameSizeRotationProfileKey {
  if (!isGameSizeRotationProfileKey(profileKey)) {
    return DEFAULT_ROTATION_PROFILE_KEY;
  }

  const currentIndex = GAME_SIZE_ROTATION_PROFILE_KEYS.indexOf(
    profileKey as (typeof GAME_SIZE_ROTATION_PROFILE_KEYS)[number],
  );

  if (currentIndex === -1) {
    return DEFAULT_ROTATION_PROFILE_KEY;
  }

  const nextIndex = (currentIndex + 1) % GAME_SIZE_ROTATION_PROFILE_KEYS.length;

  return GAME_SIZE_ROTATION_PROFILE_KEYS[nextIndex]!;
}
