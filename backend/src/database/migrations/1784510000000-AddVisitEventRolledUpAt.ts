import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddVisitEventRolledUpAt1784510000000 implements MigrationInterface {
  name = "AddVisitEventRolledUpAt1784510000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "visit_event"
      ADD COLUMN "rolled_up_at" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_visit_event_rolled_up_at_entered_at"
      ON "visit_event" ("rolled_up_at", "entered_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_visit_event_rolled_up_at_entered_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "visit_event"
      DROP COLUMN "rolled_up_at"
    `);
  }
}
