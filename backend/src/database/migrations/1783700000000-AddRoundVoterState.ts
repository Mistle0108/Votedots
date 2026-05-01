import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoundVoterState1783700000000 implements MigrationInterface {
  name = "AddRoundVoterState1783700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "round_voter_state" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "issued_votes" integer NOT NULL DEFAULT 0,
        "used_votes" integer NOT NULL DEFAULT 0,
        "round_id" integer,
        "voter_id" integer,
        CONSTRAINT "UQ_round_voter_state_round_voter" UNIQUE ("round_id", "voter_id"),
        CONSTRAINT "PK_round_voter_state_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_round_voter_state_round_id"
      ON "round_voter_state" ("round_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_round_voter_state_voter_id"
      ON "round_voter_state" ("voter_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "round_voter_state"
      ADD CONSTRAINT "FK_round_voter_state_round_id"
      FOREIGN KEY ("round_id") REFERENCES "vote_round"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "round_voter_state"
      ADD CONSTRAINT "FK_round_voter_state_voter_id"
      FOREIGN KEY ("voter_id") REFERENCES "voter"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "round_voter_state"
      DROP CONSTRAINT "FK_round_voter_state_voter_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "round_voter_state"
      DROP CONSTRAINT "FK_round_voter_state_round_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_round_voter_state_voter_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_round_voter_state_round_id"
    `);
    await queryRunner.query(`DROP TABLE "round_voter_state"`);
  }
}
