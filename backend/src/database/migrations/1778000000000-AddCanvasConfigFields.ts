import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCanvasConfigFields1778000000000 implements MigrationInterface {
  name = "AddCanvasConfigFields1778000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "canvas" ADD "configProfileKey" character varying(64) NOT NULL DEFAULT 'default'`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas" ADD "configSnapshot" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "canvas" DROP COLUMN "configSnapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas" DROP COLUMN "configProfileKey"`,
    );
  }
}
