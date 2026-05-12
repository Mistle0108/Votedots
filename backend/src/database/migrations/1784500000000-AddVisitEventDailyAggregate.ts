import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddVisitEventDailyAggregate1784500000000
  implements MigrationInterface
{
  name = "AddVisitEventDailyAggregate1784500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "visit_event_daily_aggregate" (
        "id" SERIAL NOT NULL,
        "bucket_date" DATE NOT NULL,
        "event_type" character varying(32) NOT NULL,
        "browser_language" character varying(32) NOT NULL,
        "time_zone" character varying(64) NOT NULL,
        "device_type" character varying(16) NOT NULL,
        "event_count" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_visit_event_daily_aggregate_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_visit_event_daily_aggregate_bucket_event"
      ON "visit_event_daily_aggregate" ("bucket_date", "event_type")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_visit_event_daily_aggregate_bucket_dimensions"
      ON "visit_event_daily_aggregate" (
        "bucket_date",
        "event_type",
        "browser_language",
        "time_zone",
        "device_type"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_visit_event_daily_aggregate_bucket_dimensions"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_visit_event_daily_aggregate_bucket_event"
    `);

    await queryRunner.query(`
      DROP TABLE "visit_event_daily_aggregate"
    `);
  }
}
