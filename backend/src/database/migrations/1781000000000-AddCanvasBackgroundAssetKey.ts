import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCanvasBackgroundAssetKey1781000000000 implements MigrationInterface {
  name = "AddCanvasBackgroundAssetKey1781000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "canvas"
      ADD COLUMN "backgroundAssetKey" character varying(128)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "canvas"
      DROP COLUMN "backgroundAssetKey"
    `);
  }
}
