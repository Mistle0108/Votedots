import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMypageSummaryFoundation1784900000000
  implements MigrationInterface
{
  name = "AddMypageSummaryFoundation1784900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "canvas_participant_summary" (
        "id" SERIAL NOT NULL,
        "grid_x" integer NOT NULL,
        "grid_y" integer NOT NULL,
        "used_vote_count" integer NOT NULL DEFAULT 0,
        "last_voted_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_top_voter" boolean NOT NULL DEFAULT false,
        "ended_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "canvas_id" integer,
        "voter_id" integer,
        CONSTRAINT "UQ_canvas_participant_summary_canvas_voter"
          UNIQUE ("canvas_id", "voter_id"),
        CONSTRAINT "PK_canvas_participant_summary_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_canvas_participant_summary_voter_ended_at"
      ON "canvas_participant_summary" ("voter_id", "ended_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_canvas_participant_summary_voter_grid"
      ON "canvas_participant_summary" ("voter_id", "grid_x", "grid_y")
    `);

    await queryRunner.query(`
      ALTER TABLE "canvas_participant_summary"
      ADD CONSTRAINT "FK_canvas_participant_summary_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "canvas_participant_summary"
      ADD CONSTRAINT "FK_canvas_participant_summary_voter_id"
      FOREIGN KEY ("voter_id") REFERENCES "voter"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD COLUMN "final_result_storage_path" character varying(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD COLUMN "final_result_mime_type" character varying(32)
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD COLUMN "final_result_format" character varying(16)
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD COLUMN "final_result_width" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD COLUMN "final_result_height" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD COLUMN "final_result_byte_size" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD COLUMN "final_result_captured_at" TIMESTAMP WITH TIME ZONE
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP COLUMN "final_result_captured_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP COLUMN "final_result_byte_size"
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP COLUMN "final_result_height"
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP COLUMN "final_result_width"
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP COLUMN "final_result_format"
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP COLUMN "final_result_mime_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP COLUMN "final_result_storage_path"
    `);

    await queryRunner.query(`
      ALTER TABLE "canvas_participant_summary"
      DROP CONSTRAINT "FK_canvas_participant_summary_voter_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "canvas_participant_summary"
      DROP CONSTRAINT "FK_canvas_participant_summary_canvas_id"
    `);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_canvas_participant_summary_voter_grid"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_canvas_participant_summary_voter_ended_at"`,
    );
    await queryRunner.query(`DROP TABLE "canvas_participant_summary"`);
  }
}
