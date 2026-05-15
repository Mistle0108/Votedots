import { AppDataSource } from "../../database/data-source";
import { VisitEvent } from "../../entities/visit-event.entity";

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ROLLUP_TIME_ZONE = "Asia/Seoul";

export interface AnalyticsRollupOptions {
  apply: boolean;
  before?: Date;
}

export interface AnalyticsCleanupOptions {
  apply: boolean;
  before?: Date;
  retentionDays: number;
}

export interface AnalyticsRetentionEventCount {
  count: number;
  eventType: string;
}

export interface AnalyticsRollupDeviceTimeZoneEventCount {
  count: number;
  deviceType: string;
  eventType: string;
  timeZone: string;
}

export interface AnalyticsRollupSummary {
  aggregateGroupCount: number;
  applied: boolean;
  deviceTimeZoneEventCounts: AnalyticsRollupDeviceTimeZoneEventCount[];
  eventCounts: AnalyticsRetentionEventCount[];
  eligibleEventCount: number;
  markedEventCount: number;
  oldestEligibleEnteredAt: string | null;
  rolledUpGroupCount: number;
  upperBoundIso: string;
}

export interface AnalyticsCleanupSummary {
  applied: boolean;
  cutoffIso: string;
  deletableEventCount: number;
  deletedCount: number;
  eventCounts: AnalyticsRetentionEventCount[];
  oldestDeletableEnteredAt: string | null;
  pendingUnrolledEventCount: number;
}

interface RollupPreviewRow {
  aggregateGroupCount: string;
  eligibleEventCount: string;
  oldestEligibleEnteredAt: Date | null;
}

interface CleanupPreviewRow {
  deletableEventCount: string;
  oldestDeletableEnteredAt: Date | null;
  pendingUnrolledEventCount: string;
}

interface EventCountRow {
  count: string;
  eventType: string;
}

interface DeviceTimeZoneEventCountRow {
  count: string;
  deviceType: string;
  eventType: string;
  timeZone: string;
}

function resolveRollupUpperBound(before?: Date): Date {
  if (before) {
    return before;
  }

  const now = Date.now();
  const kstNow = now + KST_OFFSET_MS;
  const startOfKstDay = Math.floor(kstNow / DAY_MS) * DAY_MS;
  return new Date(startOfKstDay - KST_OFFSET_MS);
}

function resolveCleanupCutoff(options: Pick<AnalyticsCleanupOptions, "before" | "retentionDays">): Date {
  if (options.before) {
    return options.before;
  }

  return new Date(Date.now() - options.retentionDays * DAY_MS);
}

async function loadEventCounts(
  whereClause: string,
  parameters: unknown[],
): Promise<AnalyticsRetentionEventCount[]> {
  const rows = (await AppDataSource.query(
    `
      SELECT event_type AS "eventType", COUNT(*)::int AS "count"
      FROM visit_event
      WHERE ${whereClause}
      GROUP BY event_type
      ORDER BY event_type ASC
    `,
    parameters,
  )) as EventCountRow[];

  return rows.map((row) => ({
    eventType: row.eventType,
    count: Number(row.count),
  }));
}

async function loadDeviceTimeZoneEventCounts(
  whereClause: string,
  parameters: unknown[],
): Promise<AnalyticsRollupDeviceTimeZoneEventCount[]> {
  const rows = (await AppDataSource.query(
    `
      SELECT
        device_type AS "deviceType",
        time_zone AS "timeZone",
        event_type AS "eventType",
        COUNT(*)::int AS "count"
      FROM visit_event
      WHERE ${whereClause}
      GROUP BY device_type, time_zone, event_type
      ORDER BY
        CASE device_type
          WHEN 'desktop' THEN 1
          WHEN 'mobile' THEN 2
          WHEN 'tablet' THEN 3
          WHEN 'other' THEN 4
          ELSE 5
        END ASC,
        time_zone ASC,
        event_type ASC
    `,
    parameters,
  )) as DeviceTimeZoneEventCountRow[];

  return rows.map((row) => ({
    count: Number(row.count),
    deviceType: row.deviceType,
    eventType: row.eventType,
    timeZone: row.timeZone,
  }));
}

async function loadRollupPreview(upperBound: Date): Promise<{
  aggregateGroupCount: number;
  deviceTimeZoneEventCounts: AnalyticsRollupDeviceTimeZoneEventCount[];
  eligibleEventCount: number;
  eventCounts: AnalyticsRetentionEventCount[];
  oldestEligibleEnteredAt: string | null;
}> {
  const [previewRow] = (await AppDataSource.query(
    `
      SELECT
        COUNT(*)::int AS "eligibleEventCount",
        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM (
              SELECT 1
              FROM visit_event
              WHERE rolled_up_at IS NULL
                AND entered_at < $1
              GROUP BY
                DATE(entered_at AT TIME ZONE '${ROLLUP_TIME_ZONE}'),
                event_type,
                browser_language,
                time_zone,
                device_type
            ) grouped_events
          ),
          0
        ) AS "aggregateGroupCount",
        MIN(entered_at) AS "oldestEligibleEnteredAt"
      FROM visit_event
      WHERE rolled_up_at IS NULL
        AND entered_at < $1
    `,
    [upperBound.toISOString()],
  )) as RollupPreviewRow[];

  const eventCounts = await loadEventCounts(
    "rolled_up_at IS NULL AND entered_at < $1",
    [upperBound.toISOString()],
  );
  const deviceTimeZoneEventCounts = await loadDeviceTimeZoneEventCounts(
    "rolled_up_at IS NULL AND entered_at < $1",
    [upperBound.toISOString()],
  );

  return {
    aggregateGroupCount: Number(previewRow?.aggregateGroupCount ?? 0),
    deviceTimeZoneEventCounts,
    eligibleEventCount: Number(previewRow?.eligibleEventCount ?? 0),
    eventCounts,
    oldestEligibleEnteredAt: previewRow?.oldestEligibleEnteredAt
      ? new Date(previewRow.oldestEligibleEnteredAt).toISOString()
      : null,
  };
}

async function loadCleanupPreview(cutoff: Date): Promise<{
  deletableEventCount: number;
  eventCounts: AnalyticsRetentionEventCount[];
  oldestDeletableEnteredAt: string | null;
  pendingUnrolledEventCount: number;
}> {
  const [previewRow] = (await AppDataSource.query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE rolled_up_at IS NOT NULL AND entered_at < $1
        )::int AS "deletableEventCount",
        COUNT(*) FILTER (
          WHERE rolled_up_at IS NULL AND entered_at < $1
        )::int AS "pendingUnrolledEventCount",
        MIN(entered_at) FILTER (
          WHERE rolled_up_at IS NOT NULL AND entered_at < $1
        ) AS "oldestDeletableEnteredAt"
      FROM visit_event
    `,
    [cutoff.toISOString()],
  )) as CleanupPreviewRow[];

  const eventCounts = await loadEventCounts(
    "rolled_up_at IS NOT NULL AND entered_at < $1",
    [cutoff.toISOString()],
  );

  return {
    deletableEventCount: Number(previewRow?.deletableEventCount ?? 0),
    eventCounts,
    oldestDeletableEnteredAt: previewRow?.oldestDeletableEnteredAt
      ? new Date(previewRow.oldestDeletableEnteredAt).toISOString()
      : null,
    pendingUnrolledEventCount: Number(
      previewRow?.pendingUnrolledEventCount ?? 0,
    ),
  };
}

export const analyticsRetentionService = {
  async rollupVisitEvents(
    options: AnalyticsRollupOptions,
  ): Promise<AnalyticsRollupSummary> {
    const upperBound = resolveRollupUpperBound(options.before);
    const preview = await loadRollupPreview(upperBound);

    if (!options.apply || preview.eligibleEventCount === 0) {
      return {
        ...preview,
        applied: false,
        markedEventCount: 0,
        rolledUpGroupCount: 0,
        upperBoundIso: upperBound.toISOString(),
      };
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rolledUpRows = (await queryRunner.query(
        `
          INSERT INTO visit_event_daily_aggregate (
            bucket_date,
            event_type,
            browser_language,
            time_zone,
            device_type,
            event_count
          )
          SELECT
            DATE(entered_at AT TIME ZONE '${ROLLUP_TIME_ZONE}') AS bucket_date,
            event_type,
            browser_language,
            time_zone,
            device_type,
            COUNT(*)::int AS event_count
          FROM visit_event
          WHERE rolled_up_at IS NULL
            AND entered_at < $1
          GROUP BY
            DATE(entered_at AT TIME ZONE '${ROLLUP_TIME_ZONE}'),
            event_type,
            browser_language,
            time_zone,
            device_type
          ON CONFLICT (
            bucket_date,
            event_type,
            browser_language,
            time_zone,
            device_type
          )
          DO UPDATE SET
            event_count = visit_event_daily_aggregate.event_count + EXCLUDED.event_count,
            updated_at = now()
          RETURNING id
        `,
        [upperBound.toISOString()],
      )) as Array<{ id: number }>;

      const markResult = await queryRunner.manager
        .createQueryBuilder()
        .update(VisitEvent)
        .set({
          rolledUpAt: () => "now()",
        })
        .where("rolled_up_at IS NULL")
        .andWhere("entered_at < :upperBound", {
          upperBound: upperBound.toISOString(),
        })
        .execute();

      await queryRunner.commitTransaction();

      return {
        ...preview,
        applied: true,
        markedEventCount: markResult.affected ?? 0,
        rolledUpGroupCount: rolledUpRows.length,
        upperBoundIso: upperBound.toISOString(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  },

  async cleanupVisitEvents(
    options: AnalyticsCleanupOptions,
  ): Promise<AnalyticsCleanupSummary> {
    const cutoff = resolveCleanupCutoff(options);
    const preview = await loadCleanupPreview(cutoff);

    if (!options.apply || preview.deletableEventCount === 0) {
      return {
        ...preview,
        applied: false,
        cutoffIso: cutoff.toISOString(),
        deletedCount: 0,
      };
    }

    const deleteResult = await AppDataSource.createQueryBuilder()
      .delete()
      .from(VisitEvent)
      .where("rolled_up_at IS NOT NULL")
      .andWhere("entered_at < :cutoff", { cutoff: cutoff.toISOString() })
      .execute();

    return {
      ...preview,
      applied: true,
      cutoffIso: cutoff.toISOString(),
      deletedCount: deleteResult.affected ?? 0,
    };
  },
};
