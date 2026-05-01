import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCatFront256Template1783900000000
  implements MigrationInterface
{
  name = "RemoveCatFront256Template1783900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "canvas"
      SET
        "resultTemplateAssetKey" = CASE "resultTemplateAssetKey"
          WHEN 'cat-front-256x256' THEN 'empty-256x256'
          ELSE "resultTemplateAssetKey"
        END,
        "backgroundAssetKey" = CASE "backgroundAssetKey"
          WHEN 'cat-front-256x256' THEN 'empty-256x256'
          ELSE "backgroundAssetKey"
        END
      WHERE "resultTemplateAssetKey" = 'cat-front-256x256'
         OR "backgroundAssetKey" = 'cat-front-256x256'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SELECT 1
    `);
  }
}
