import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSummaryTables1779000000000 implements MigrationInterface {
  name = "AddSummaryTables1779000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "round_summary" (
        "id" SERIAL NOT NULL,
        "round_number" integer NOT NULL,
        "participant_count" integer NOT NULL DEFAULT '0',
        "total_votes" integer NOT NULL DEFAULT '0',
        "painted_cell_count" integer NOT NULL DEFAULT '0',
        "total_cell_count" integer NOT NULL DEFAULT '0',
        "current_painted_cell_count" integer NOT NULL DEFAULT '0',
        "canvas_progress_percent" numeric(5,2) NOT NULL DEFAULT '0',
        "most_voted_cell_id" integer,
        "most_voted_cell_x" integer,
        "most_voted_cell_y" integer,
        "most_voted_cell_vote_count" integer NOT NULL DEFAULT '0',
        "random_resolved_cell_count" integer NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "canvas_id" integer,
        "round_id" integer,
        CONSTRAINT "UQ_round_summary_round_id" UNIQUE ("round_id"),
        CONSTRAINT "PK_round_summary_id" PRIMARY KEY ("id")
      )
    `); // 추가: 라운드 종료 집계 저장 테이블

    await queryRunner.query(`
      CREATE INDEX "IDX_round_summary_canvas_id"
      ON "round_summary" ("canvas_id")
    `); // 추가: 캔버스 기준 조회 최적화

    await queryRunner.query(`
      CREATE INDEX "IDX_round_summary_round_number"
      ON "round_summary" ("round_number")
    `); // 추가: 라운드 번호 기준 조회/정렬 지원

    await queryRunner.query(`
      CREATE TABLE "game_summary" (
        "id" SERIAL NOT NULL,
        "total_rounds" integer NOT NULL DEFAULT '0',
        "participant_count" integer NOT NULL DEFAULT '0',
        "issued_ticket_count" integer NOT NULL DEFAULT '0',
        "total_votes" integer NOT NULL DEFAULT '0',
        "ticket_usage_rate" numeric(5,2) NOT NULL DEFAULT '0',
        "total_cell_count" integer NOT NULL DEFAULT '0',
        "painted_cell_count" integer NOT NULL DEFAULT '0',
        "empty_cell_count" integer NOT NULL DEFAULT '0',
        "canvas_completion_percent" numeric(5,2) NOT NULL DEFAULT '0',
        "most_voted_cell_id" integer,
        "most_voted_cell_x" integer,
        "most_voted_cell_y" integer,
        "most_voted_cell_vote_count" integer NOT NULL DEFAULT '0',
        "random_resolved_cell_count" integer NOT NULL DEFAULT '0',
        "used_color_count" integer NOT NULL DEFAULT '0',
        "most_selected_color" character varying(32),
        "most_selected_color_vote_count" integer NOT NULL DEFAULT '0',
        "most_painted_color" character varying(32),
        "most_painted_color_cell_count" integer NOT NULL DEFAULT '0',
        "top_voter_id" integer,
        "top_voter_name" character varying(100),
        "top_voter_vote_count" integer NOT NULL DEFAULT '0',
        "hottest_round_id" integer,
        "hottest_round_number" integer,
        "hottest_round_vote_count" integer NOT NULL DEFAULT '0',
        "top_voters_json" text,
        "participants_json" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "canvas_id" integer,
        CONSTRAINT "UQ_game_summary_canvas_id" UNIQUE ("canvas_id"),
        CONSTRAINT "PK_game_summary_id" PRIMARY KEY ("id")
      )
    `); // 추가: 게임 종료 종합 집계 저장 테이블

    await queryRunner.query(`
      CREATE INDEX "IDX_game_summary_canvas_id"
      ON "game_summary" ("canvas_id")
    `); // 추가: 캔버스별 단건 조회 최적화

    await queryRunner.query(`
      ALTER TABLE "round_summary"
      ADD CONSTRAINT "FK_round_summary_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `); // 추가: 캔버스 삭제 시 라운드 집계 정리

    await queryRunner.query(`
      ALTER TABLE "round_summary"
      ADD CONSTRAINT "FK_round_summary_round_id"
      FOREIGN KEY ("round_id") REFERENCES "vote_round"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `); // 추가: 라운드 삭제 시 해당 집계 정리

    await queryRunner.query(`
      ALTER TABLE "game_summary"
      ADD CONSTRAINT "FK_game_summary_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `); // 추가: 캔버스 삭제 시 게임 집계 정리
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_summary"
      DROP CONSTRAINT "FK_game_summary_canvas_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "round_summary"
      DROP CONSTRAINT "FK_round_summary_round_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "round_summary"
      DROP CONSTRAINT "FK_round_summary_canvas_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_game_summary_canvas_id"
    `);

    await queryRunner.query(`
      DROP TABLE "game_summary"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_round_summary_round_number"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_round_summary_canvas_id"
    `);

    await queryRunner.query(`
      DROP TABLE "round_summary"
    `);
  }
}
