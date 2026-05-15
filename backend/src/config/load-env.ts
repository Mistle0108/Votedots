import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

let loaded = false;
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const SERVER_ENV_ROOT = "/opt/votedots/env/backend";

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

  const envFileName = resolveEnvFileName();
  const candidatePaths = [
    path.resolve(SERVER_ENV_ROOT, envFileName),
    path.resolve(BACKEND_ROOT, envFileName),
    path.resolve(BACKEND_ROOT, ".env"),
  ];
  const selectedPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) ?? null;

  if (selectedPath) {
    config({
      path: selectedPath,
      quiet: true,
    });
  }

  loaded = true;
}
