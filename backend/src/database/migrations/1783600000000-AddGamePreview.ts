import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGamePreview1783600000000 implements MigrationInterface {
  name = "AddGamePreview1783600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "game_preview" (
        "id" SERIAL NOT NULL,
        "status" character varying(16) NOT NULL,
        "storage_path" character varying(255),
        "mime_type" character varying(32),
        "format" character varying(16),
        "width" integer,
        "height" integer,
        "byte_size" integer,
        "frame_count" integer,
        "size_key" character varying(32) NOT NULL,
        "grid_x" integer NOT NULL,
        "grid_y" integer NOT NULL,
        "ended_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "participant_count" integer NOT NULL DEFAULT '0',
        "participants_json" text,
        "top_voter_name" character varying(100),
        "top_voter_vote_count" integer NOT NULL DEFAULT '0',
        "total_votes" integer NOT NULL DEFAULT '0',
        "failure_reason" character varying(128),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "canvas_id" integer,
        "game_summary_id" integer,
        CONSTRAINT "PK_game_preview_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_game_preview_canvas_id" UNIQUE ("canvas_id"),
        CONSTRAINT "UQ_game_preview_game_summary_id" UNIQUE ("game_summary_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_game_preview_status_size"
      ON "game_preview" ("status", "size_key")
    `);

    await queryRunner.query(`
      ALTER TABLE "game_preview"
      ADD CONSTRAINT "FK_game_preview_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "game_preview"
      ADD CONSTRAINT "FK_game_preview_game_summary_id"
      FOREIGN KEY ("game_summary_id") REFERENCES "game_summary"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_preview"
      DROP CONSTRAINT "FK_game_preview_game_summary_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "game_preview"
      DROP CONSTRAINT "FK_game_preview_canvas_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_game_preview_status_size"
    `);
    await queryRunner.query(`
      DROP TABLE "game_preview"
    `);
  }
}
