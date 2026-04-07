import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCanvasPhaseFields1775529600000 implements MigrationInterface {
  name = "AddCanvasPhaseFields1775529600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "canvas" ADD "phase" character varying(24) NOT NULL DEFAULT 'round_active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas" ADD "phaseStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas" ADD "phaseEndsAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas" ADD "currentRoundNumber" smallint NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "canvas" DROP COLUMN "currentRoundNumber"`,
    );
    await queryRunner.query(`ALTER TABLE "canvas" DROP COLUMN "phaseEndsAt"`);
    await queryRunner.query(
      `ALTER TABLE "canvas" DROP COLUMN "phaseStartedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "canvas" DROP COLUMN "phase"`);
  }
}
