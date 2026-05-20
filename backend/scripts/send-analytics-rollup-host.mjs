import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

const DEFAULT_ENV_PATH = "/opt/votedots/env/backend/.env.production";
const DEFAULT_MESSAGE_PATH = "/opt/votedots/data/runtime/analytics-rollup-message.txt";
const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const TELEGRAM_RETRY_DELAYS_MS = [5_000, 15_000];

function parseArgs(argv) {
  const options = {
    envFile: DEFAULT_ENV_PATH,
    messagePath: DEFAULT_MESSAGE_PATH,
  };

  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) {
      options.envFile = arg.slice("--env-file=".length);
      continue;
    }

    if (arg.startsWith("--message-path=")) {
      options.messagePath = arg.slice("--message-path=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function loadEnvironment(envFile) {
  config({
    path: envFile,
    quiet: true,
  });
}

function getRequiredEnvironmentValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function isRetryableTelegramError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("timedout") ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("enetunreach") ||
    message.includes("eai_again")
  ) {
    return true;
  }

  const cause = error.cause ?? null;

  if (cause instanceof Error) {
    return isRetryableTelegramError(cause);
  }

  if (
    typeof cause === "object" &&
    cause !== null &&
    "errors" in cause &&
    Array.isArray(cause.errors)
  ) {
    return cause.errors.some((childError) => isRetryableTelegramError(childError));
  }

  return false;
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function sendMessage(text) {
  const botToken = getRequiredEnvironmentValue("TELEGRAM_BOT_TOKEN");
  const chatId = getRequiredEnvironmentValue("TELEGRAM_CHAT_ID");
  const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const rawPayload = await response.text();
  let payload = null;

  if (rawPayload) {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      `Telegram API request failed with status ${response.status}${payload?.description ? `: ${payload.description}` : ""}`,
    );
  }

  if (payload && !payload.ok) {
    throw new Error(`Telegram API responded with ok=false${payload.description ? `: ${payload.description}` : ""}`);
  }
}

async function sendMessageWithRetry(text) {
  let lastError = null;

  for (let attempt = 0; attempt <= TELEGRAM_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await sendMessage(text);
      return;
    } catch (error) {
      lastError = error;

      if (
        attempt >= TELEGRAM_RETRY_DELAYS_MS.length ||
        !isRetryableTelegramError(error)
      ) {
        break;
      }

      await wait(TELEGRAM_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvironment(options.envFile);

  const messagePath = path.resolve(options.messagePath);
  let text = "";

  try {
    text = (await readFile(messagePath, "utf8")).trim();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.log("[analytics:rollup:host-fallback] no pending message file");
      return;
    }

    throw error;
  }

  if (!text) {
    console.log("[analytics:rollup:host-fallback] message file is empty");
    return;
  }

  await sendMessageWithRetry(text);
  await rm(messagePath, { force: true });
  console.log("[analytics:rollup:host-fallback] telegram notification sent");
}

main().catch((error) => {
  console.error("[analytics:rollup:host-fallback] failed:", error);
  process.exit(1);
});
