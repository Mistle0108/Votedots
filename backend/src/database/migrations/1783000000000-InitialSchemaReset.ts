import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchemaReset1783000000000 implements MigrationInterface {
  name = "InitialSchemaReset1783000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    `);

    await queryRunner.query(`
      CREATE TABLE "canvas" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "gridX" smallint NOT NULL DEFAULT '10',
        "gridY" smallint NOT NULL DEFAULT '10',
        "configProfileKey" character varying(64) NOT NULL DEFAULT 'default',
        "backgroundAssetKey" character varying(128),
        "configSnapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" character varying(16) NOT NULL DEFAULT 'playing',
        "phase" character varying(24) NOT NULL DEFAULT 'round_active',
        "phaseStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "phaseEndsAt" TIMESTAMP WITH TIME ZONE,
        "currentRoundNumber" smallint NOT NULL DEFAULT '0',
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "endedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_canvas_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "voter" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying(32) NOT NULL,
        "password" character varying(255) NOT NULL,
        "nickname" character varying(32) NOT NULL,
        "role" character varying(16) NOT NULL DEFAULT 'user',
        CONSTRAINT "UQ_voter_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_voter_username" UNIQUE ("username"),
        CONSTRAINT "PK_voter_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cell" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "x" smallint NOT NULL,
        "y" smallint NOT NULL,
        "color" character varying(7) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'painted',
        "canvas_id" integer,
        CONSTRAINT "UQ_cell_canvas_xy" UNIQUE ("canvas_id", "x", "y"),
        CONSTRAINT "PK_cell_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vote_round" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "roundNumber" smallint NOT NULL,
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "endedAt" TIMESTAMP WITH TIME ZONE,
        "isActive" boolean NOT NULL DEFAULT true,
        "canvas_id" integer,
        CONSTRAINT "UQ_vote_round_canvas_round_number" UNIQUE ("canvas_id", "roundNumber"),
        CONSTRAINT "PK_vote_round_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vote_ticket" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "isUsed" boolean NOT NULL DEFAULT false,
        "round_id" integer,
        "voter_id" integer,
        CONSTRAINT "PK_vote_ticket_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vote" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "x" smallint NOT NULL,
        "y" smallint NOT NULL,
        "color" character varying(7) NOT NULL,
        "round_id" integer,
        "voter_id" integer,
        "ticket_id" integer,
        CONSTRAINT "UQ_vote_ticket_id" UNIQUE ("ticket_id"),
        CONSTRAINT "PK_vote_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "game_summary" (
        "id" SERIAL NOT NULL,
        "total_rounds" integer NOT NULL DEFAULT 0,
        "participant_count" integer NOT NULL DEFAULT 0,
        "issued_ticket_count" integer NOT NULL DEFAULT 0,
        "total_votes" integer NOT NULL DEFAULT 0,
        "ticket_usage_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "total_cell_count" integer NOT NULL DEFAULT 0,
        "painted_cell_count" integer NOT NULL DEFAULT 0,
        "empty_cell_count" integer NOT NULL DEFAULT 0,
        "canvas_completion_percent" numeric(5,2) NOT NULL DEFAULT 0,
        "most_voted_cell_id" integer,
        "most_voted_cell_x" integer,
        "most_voted_cell_y" integer,
        "most_voted_cell_vote_count" integer NOT NULL DEFAULT 0,
        "random_resolved_cell_count" integer NOT NULL DEFAULT 0,
        "used_color_count" integer NOT NULL DEFAULT 0,
        "most_selected_color" character varying(32),
        "most_selected_color_vote_count" integer NOT NULL DEFAULT 0,
        "most_painted_color" character varying(32),
        "most_painted_color_cell_count" integer NOT NULL DEFAULT 0,
        "top_voter_id" integer,
        "top_voter_name" character varying(100),
        "top_voter_vote_count" integer NOT NULL DEFAULT 0,
        "hottest_round_id" integer,
        "hottest_round_number" integer,
        "hottest_round_vote_count" integer NOT NULL DEFAULT 0,
        "top_voters_json" text,
        "participants_json" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "canvas_id" integer,
        CONSTRAINT "UQ_game_summary_canvas_id" UNIQUE ("canvas_id"),
        CONSTRAINT "PK_game_summary_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_game_summary_canvas_id"
      ON "game_summary" ("canvas_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "round_summary" (
        "id" SERIAL NOT NULL,
        "round_number" integer NOT NULL,
        "participant_count" integer NOT NULL DEFAULT 0,
        "total_votes" integer NOT NULL DEFAULT 0,
        "painted_cell_count" integer NOT NULL DEFAULT 0,
        "total_cell_count" integer NOT NULL DEFAULT 0,
        "current_painted_cell_count" integer NOT NULL DEFAULT 0,
        "canvas_progress_percent" numeric(5,2) NOT NULL DEFAULT 0,
        "most_voted_cell_id" integer,
        "most_voted_cell_x" integer,
        "most_voted_cell_y" integer,
        "most_voted_cell_vote_count" integer NOT NULL DEFAULT 0,
        "random_resolved_cell_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "canvas_id" integer,
        "round_id" integer,
        CONSTRAINT "UQ_round_summary_round_id" UNIQUE ("round_id"),
        CONSTRAINT "PK_round_summary_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_round_summary_canvas_id"
      ON "round_summary" ("canvas_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_round_summary_round_number"
      ON "round_summary" ("round_number")
    `);

    await queryRunner.query(`
      CREATE TABLE "round_snapshot" (
        "id" SERIAL NOT NULL,
        "round_number" integer NOT NULL,
        "storage_path" character varying(255) NOT NULL,
        "mime_type" character varying(32) NOT NULL,
        "format" character varying(16) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "byte_size" integer NOT NULL,
        "captured_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "canvas_id" integer,
        "round_id" integer,
        CONSTRAINT "UQ_round_snapshot_round_id" UNIQUE ("round_id"),
        CONSTRAINT "UQ_round_snapshot_canvas_round_number" UNIQUE ("canvas_id", "round_number"),
        CONSTRAINT "PK_round_snapshot_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_round_snapshot_canvas_id"
      ON "round_snapshot" ("canvas_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "cell"
      ADD CONSTRAINT "FK_cell_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vote_round"
      ADD CONSTRAINT "FK_vote_round_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vote_ticket"
      ADD CONSTRAINT "FK_vote_ticket_round_id"
      FOREIGN KEY ("round_id") REFERENCES "vote_round"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vote_ticket"
      ADD CONSTRAINT "FK_vote_ticket_voter_id"
      FOREIGN KEY ("voter_id") REFERENCES "voter"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vote"
      ADD CONSTRAINT "FK_vote_round_id"
      FOREIGN KEY ("round_id") REFERENCES "vote_round"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vote"
      ADD CONSTRAINT "FK_vote_voter_id"
      FOREIGN KEY ("voter_id") REFERENCES "voter"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vote"
      ADD CONSTRAINT "FK_vote_ticket_id"
      FOREIGN KEY ("ticket_id") REFERENCES "vote_ticket"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD CONSTRAINT "FK_game_summary_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "round_summary"
      ADD CONSTRAINT "FK_round_summary_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "round_summary"
      ADD CONSTRAINT "FK_round_summary_round_id"
      FOREIGN KEY ("round_id") REFERENCES "vote_round"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "round_snapshot"
      ADD CONSTRAINT "FK_round_snapshot_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "round_snapshot"
      ADD CONSTRAINT "FK_round_snapshot_round_id"
      FOREIGN KEY ("round_id") REFERENCES "vote_round"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "round_snapshot" DROP CONSTRAINT "FK_round_snapshot_round_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "round_snapshot" DROP CONSTRAINT "FK_round_snapshot_canvas_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "round_summary" DROP CONSTRAINT "FK_round_summary_round_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "round_summary" DROP CONSTRAINT "FK_round_summary_canvas_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_summary" DROP CONSTRAINT "FK_game_summary_canvas_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "FK_vote_ticket_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "FK_vote_voter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "FK_vote_round_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote_ticket" DROP CONSTRAINT "FK_vote_ticket_voter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote_ticket" DROP CONSTRAINT "FK_vote_ticket_round_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote_round" DROP CONSTRAINT "FK_vote_round_canvas_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cell" DROP CONSTRAINT "FK_cell_canvas_id"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_round_snapshot_canvas_id"`,
    );
    await queryRunner.query(`DROP TABLE "round_snapshot"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_round_summary_round_number"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_round_summary_canvas_id"`,
    );
    await queryRunner.query(`DROP TABLE "round_summary"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_game_summary_canvas_id"`);
    await queryRunner.query(`DROP TABLE "game_summary"`);

    await queryRunner.query(`DROP TABLE "vote"`);
    await queryRunner.query(`DROP TABLE "vote_ticket"`);
    await queryRunner.query(`DROP TABLE "vote_round"`);
    await queryRunner.query(`DROP TABLE "cell"`);
    await queryRunner.query(`DROP TABLE "voter"`);
    await queryRunner.query(`DROP TABLE "canvas"`);
  }
}
