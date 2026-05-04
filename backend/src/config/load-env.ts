import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

let loaded = false;
const BACKEND_ROOT = path.resolve(__dirname, "../..");

function resolveEnvFileName(): string {
  switch (process.env.NODE_ENV) {
    case "production":
      return ".env.production";
    case "test":
      return ".env.test";
    default:
      return ".env.development";
  }
}

export function loadEnvironment(): void {
  if (loaded) {
    return;
  }

  const preferredPath = path.resolve(BACKEND_ROOT, resolveEnvFileName());
  const fallbackPath = path.resolve(BACKEND_ROOT, ".env");
  const selectedPath = fs.existsSync(preferredPath)
    ? preferredPath
    : fs.existsSync(fallbackPath)
      ? fallbackPath
      : null;

  if (selectedPath) {
    config({
      path: selectedPath,
      quiet: true,
    });
  }

  loaded = true;
}
