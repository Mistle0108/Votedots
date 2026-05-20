import "reflect-metadata";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvironment } from "../config/load-env";
import { AppDataSource } from "../database/data-source";
import { analyticsRetentionService } from "../modules/analytics/analytics-retention.service";
import { analyticsRollupTelegramService } from "../modules/analytics/analytics-rollup-telegram.service";

interface AnalyticsRollupCliOptions {
  apply: boolean;
  before?: Date;
}

const ANALYTICS_ROLLUP_MESSAGE_PATH_ENV = "ANALYTICS_ROLLUP_MESSAGE_PATH";

function parseBeforeDate(value: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --before value: ${value}`);
  }

  return parsed;
}

function parseArgs(argv: string[]): AnalyticsRollupCliOptions {
  let apply = false;
  let before: Date | undefined;

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--dry-run") {
      apply = false;
      continue;
    }

    if (arg.startsWith("--before=")) {
      before = parseBeforeDate(arg.slice("--before=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    apply,
    before,
  };
}

function printSummary(summary: Awaited<
  ReturnType<typeof analyticsRetentionService.rollupVisitEvents>
>): void {
  console.log("[analytics:rollup] mode:", summary.applied ? "apply" : "dry-run");
  console.log("[analytics:rollup] upperBound:", summary.upperBoundIso);
  console.log("[analytics:rollup] dailySignupCount:", summary.dailySignupCount);
  console.log("[analytics:rollup] eligibleEventCount:", summary.eligibleEventCount);
  console.log("[analytics:rollup] aggregateGroupCount:", summary.aggregateGroupCount);
  console.log(
    "[analytics:rollup] oldestEligibleEnteredAt:",
    summary.oldestEligibleEnteredAt ?? "none",
  );

  if (summary.eventCounts.length > 0) {
    console.log("[analytics:rollup] eventCounts:");

    for (const eventCount of summary.eventCounts) {
      console.log(`- ${eventCount.eventType}: ${eventCount.count}`);
    }
  }

  console.log("[analytics:rollup] rolledUpGroupCount:", summary.rolledUpGroupCount);
  console.log("[analytics:rollup] markedEventCount:", summary.markedEventCount);
}

async function writeRollupMessageFile(messagePath: string, text: string): Promise<void> {
  const directoryPath = path.dirname(messagePath);
  const temporaryPath = `${messagePath}.tmp`;

  await mkdir(directoryPath, { recursive: true });
  await writeFile(temporaryPath, text, "utf8");
  await rename(temporaryPath, messagePath);
}

async function removeRollupMessageFile(messagePath: string): Promise<void> {
  await rm(messagePath, { force: true });
}

async function main() {
  loadEnvironment();

  const options = parseArgs(process.argv.slice(2));
  const rollupMessagePath = process.env[ANALYTICS_ROLLUP_MESSAGE_PATH_ENV]?.trim() || null;

  await AppDataSource.initialize();

  try {
    const summary = await analyticsRetentionService.rollupVisitEvents(options);
    printSummary(summary);

    if (options.apply) {
      const messageText =
        analyticsRollupTelegramService.buildRollupSummaryMessage(summary);

      if (rollupMessagePath) {
        await writeRollupMessageFile(rollupMessagePath, messageText);
        console.log("[analytics:rollup] fallback message file written:", rollupMessagePath);
      }

      try {
        await analyticsRollupTelegramService.sendTextMessage(messageText);

        if (rollupMessagePath) {
          await removeRollupMessageFile(rollupMessagePath);
          console.log("[analytics:rollup] fallback message file removed:", rollupMessagePath);
        }

        console.log("[analytics:rollup] telegram notification sent");
      } catch (error) {
        console.error("[analytics:rollup] telegram notification failed:", error);
      }
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error("[analytics:rollup] failed:", error);
  process.exit(1);
});
