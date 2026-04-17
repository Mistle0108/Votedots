import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoundSnapshotTable1780000000000 implements MigrationInterface {
  name = "AddRoundSnapshotTable1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        CONSTRAINT "UQ_round_snapshot_canvas_round_number" UNIQUE ("canvas_id", "round_number"),
        CONSTRAINT "UQ_round_snapshot_round_id" UNIQUE ("round_id"),
        CONSTRAINT "PK_round_snapshot_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_round_snapshot_canvas_id"
      ON "round_snapshot" ("canvas_id")
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
    await queryRunner.query(`
      ALTER TABLE "round_snapshot"
      DROP CONSTRAINT "FK_round_snapshot_round_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "round_snapshot"
      DROP CONSTRAINT "FK_round_snapshot_canvas_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_round_snapshot_canvas_id"
    `);

    await queryRunner.query(`
      DROP TABLE "round_snapshot"
    `);
  }
}
