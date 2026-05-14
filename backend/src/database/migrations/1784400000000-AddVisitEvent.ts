import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddVisitEvent1784400000000 implements MigrationInterface {
  name = "AddVisitEvent1784400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "visit_event" (
        "id" SERIAL NOT NULL,
        "event_type" character varying(32) NOT NULL,
        "browser_language" character varying(32) NOT NULL,
        "time_zone" character varying(64) NOT NULL,
        "device_type" character varying(16) NOT NULL,
        "entered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_visit_event_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_visit_event_type_entered_at"
      ON "visit_event" ("event_type", "entered_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_visit_event_type_entered_at"
    `);

    await queryRunner.query(`
      DROP TABLE "visit_event"
    `);
  }
}
