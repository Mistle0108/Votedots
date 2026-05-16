import type { MigrationInterface, QueryRunner } from "typeorm";

const VISIT_EVENT_RENAMES = [
  {
    from: "site_visit",
    to: "landing_visit",
  },
  {
    from: "game_entry",
    to: "room_visit",
  },
] as const;

function buildAggregateMergeCondition(sourceAlias: string, targetAlias: string): string {
  return `
    ${sourceAlias}.bucket_date = ${targetAlias}.bucket_date
    AND ${sourceAlias}.browser_language = ${targetAlias}.browser_language
    AND ${sourceAlias}.time_zone = ${targetAlias}.time_zone
    AND ${sourceAlias}.device_type = ${targetAlias}.device_type
  `;
}

export class RenameVisitEventTypes1784800000000 implements MigrationInterface {
  name = "RenameVisitEventTypes1784800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const rename of VISIT_EVENT_RENAMES) {
      await queryRunner.query(
        `
          UPDATE "visit_event"
          SET "event_type" = $1
          WHERE "event_type" = $2
        `,
        [rename.to, rename.from],
      );

      await queryRunner.query(
        `
          UPDATE "visit_event_daily_aggregate" AS target
          SET
            "event_count" = target."event_count" + source."event_count",
            "updated_at" = GREATEST(target."updated_at", source."updated_at")
          FROM "visit_event_daily_aggregate" AS source
          WHERE source."event_type" = $2
            AND target."event_type" = $1
            AND ${buildAggregateMergeCondition("source", "target")}
        `,
        [rename.to, rename.from],
      );

      await queryRunner.query(
        `
          DELETE FROM "visit_event_daily_aggregate" AS source
          USING "visit_event_daily_aggregate" AS target
          WHERE source."event_type" = $2
            AND target."event_type" = $1
            AND ${buildAggregateMergeCondition("source", "target")}
        `,
        [rename.to, rename.from],
      );

      await queryRunner.query(
        `
          UPDATE "visit_event_daily_aggregate"
          SET "event_type" = $1
          WHERE "event_type" = $2
        `,
        [rename.to, rename.from],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const rename of [...VISIT_EVENT_RENAMES].reverse()) {
      await queryRunner.query(
        `
          UPDATE "visit_event"
          SET "event_type" = $1
          WHERE "event_type" = $2
        `,
        [rename.from, rename.to],
      );

      await queryRunner.query(
        `
          UPDATE "visit_event_daily_aggregate" AS target
          SET
            "event_count" = target."event_count" + source."event_count",
            "updated_at" = GREATEST(target."updated_at", source."updated_at")
          FROM "visit_event_daily_aggregate" AS source
          WHERE source."event_type" = $2
            AND target."event_type" = $1
            AND ${buildAggregateMergeCondition("source", "target")}
        `,
        [rename.from, rename.to],
      );

      await queryRunner.query(
        `
          DELETE FROM "visit_event_daily_aggregate" AS source
          USING "visit_event_daily_aggregate" AS target
          WHERE source."event_type" = $2
            AND target."event_type" = $1
            AND ${buildAggregateMergeCondition("source", "target")}
        `,
        [rename.from, rename.to],
      );

      await queryRunner.query(
        `
          UPDATE "visit_event_daily_aggregate"
          SET "event_type" = $1
          WHERE "event_type" = $2
        `,
        [rename.from, rename.to],
      );
    }
  }
}
