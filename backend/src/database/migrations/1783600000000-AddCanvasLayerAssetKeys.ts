import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCanvasLayerAssetKeys1783600000000
  implements MigrationInterface
{
  name = "AddCanvasLayerAssetKeys1783600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "canvas"
      ADD "playBackgroundAssetKey" character varying(128)
    `);

    await queryRunner.query(`
      ALTER TABLE "canvas"
      ADD "resultTemplateAssetKey" character varying(128)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "canvas"
      DROP COLUMN "resultTemplateAssetKey"
    `);

    await queryRunner.query(`
      ALTER TABLE "canvas"
      DROP COLUMN "playBackgroundAssetKey"
    `);
  }
}
