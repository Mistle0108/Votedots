function readBooleanEnv(name: string, fallback: boolean): boolean {
  const rawValue = String(process.env[name] ?? "").trim().toLowerCase();

  if (!rawValue) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(rawValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(rawValue)) {
    return false;
  }

  return fallback;
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = parseInt(String(process.env[name] ?? ""), 10);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const downloadSnapshotConfig = {
  enableUpscale: readBooleanEnv("DOWNLOAD_SNAPSHOT_ENABLE_UPSCALE", true),
  maxLongestSide: readPositiveIntegerEnv(
    "DOWNLOAD_SNAPSHOT_MAX_LONGEST_SIDE",
    1024,
  ),
};
