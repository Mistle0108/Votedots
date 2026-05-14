import "reflect-metadata";
import { loadEnvironment } from "../config/load-env";
import { AppDataSource } from "../database/data-source";
import { analyticsRetentionService } from "../modules/analytics/analytics-retention.service";

interface AnalyticsRollupCliOptions {
  apply: boolean;
  before?: Date;
}

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

async function main() {
  loadEnvironment();

  const options = parseArgs(process.argv.slice(2));

  await AppDataSource.initialize();

  try {
    const summary = await analyticsRetentionService.rollupVisitEvents(options);
    printSummary(summary);
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
