import "reflect-metadata";
import { loadEnvironment } from "../config/load-env";
import { AppDataSource } from "../database/data-source";
import { analyticsRetentionService } from "../modules/analytics/analytics-retention.service";

interface AnalyticsCleanupCliOptions {
  apply: boolean;
  before?: Date;
  retentionDays: number;
}

function parseBeforeDate(value: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --before value: ${value}`);
  }

  return parsed;
}

function parseRetentionDays(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --retention-days value: ${value}`);
  }

  return parsed;
}

function parseArgs(argv: string[]): AnalyticsCleanupCliOptions {
  let apply = false;
  let before: Date | undefined;
  let retentionDays = 90;

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

    if (arg.startsWith("--retention-days=")) {
      retentionDays = parseRetentionDays(
        arg.slice("--retention-days=".length),
      );
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    apply,
    before,
    retentionDays,
  };
}

function printSummary(summary: Awaited<
  ReturnType<typeof analyticsRetentionService.cleanupVisitEvents>
>): void {
  console.log("[analytics:cleanup] mode:", summary.applied ? "apply" : "dry-run");
  console.log("[analytics:cleanup] cutoff:", summary.cutoffIso);
  console.log("[analytics:cleanup] deletableEventCount:", summary.deletableEventCount);
  console.log(
    "[analytics:cleanup] pendingUnrolledEventCount:",
    summary.pendingUnrolledEventCount,
  );
  console.log(
    "[analytics:cleanup] oldestDeletableEnteredAt:",
    summary.oldestDeletableEnteredAt ?? "none",
  );

  if (summary.eventCounts.length > 0) {
    console.log("[analytics:cleanup] eventCounts:");

    for (const eventCount of summary.eventCounts) {
      console.log(`- ${eventCount.eventType}: ${eventCount.count}`);
    }
  }

  console.log("[analytics:cleanup] deletedCount:", summary.deletedCount);
}

async function main() {
  loadEnvironment();

  const options = parseArgs(process.argv.slice(2));

  await AppDataSource.initialize();

  try {
    const summary = await analyticsRetentionService.cleanupVisitEvents(options);
    printSummary(summary);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error("[analytics:cleanup] failed:", error);
  process.exit(1);
});
