import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameLegacyResultTemplateAssetKeys1783800000000
  implements MigrationInterface
{
  name = "RenameLegacyResultTemplateAssetKeys1783800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "canvas"
      SET
        "resultTemplateAssetKey" = CASE "resultTemplateAssetKey"
          WHEN 'cat-oblique-64x64' THEN 'cat-oblique-128x128'
          WHEN 'cat-front-128x128' THEN 'cat-front-256x256'
          WHEN 'Farrot-oblique-128x128' THEN 'Farrot-oblique-512x512'
          ELSE "resultTemplateAssetKey"
        END,
        "backgroundAssetKey" = CASE "backgroundAssetKey"
          WHEN 'cat-oblique-64x64' THEN 'cat-oblique-128x128'
          WHEN 'cat-front-128x128' THEN 'cat-front-256x256'
          WHEN 'Farrot-oblique-128x128' THEN 'Farrot-oblique-512x512'
          ELSE "backgroundAssetKey"
        END
      WHERE "resultTemplateAssetKey" IN (
        'cat-oblique-64x64',
        'cat-front-128x128',
        'Farrot-oblique-128x128'
      )
      OR "backgroundAssetKey" IN (
        'cat-oblique-64x64',
        'cat-front-128x128',
        'Farrot-oblique-128x128'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "canvas"
      SET
        "resultTemplateAssetKey" = CASE "resultTemplateAssetKey"
          WHEN 'cat-oblique-128x128' THEN 'cat-oblique-64x64'
          WHEN 'cat-front-256x256' THEN 'cat-front-128x128'
          WHEN 'Farrot-oblique-512x512' THEN 'Farrot-oblique-128x128'
          ELSE "resultTemplateAssetKey"
        END,
        "backgroundAssetKey" = CASE "backgroundAssetKey"
          WHEN 'cat-oblique-128x128' THEN 'cat-oblique-64x64'
          WHEN 'cat-front-256x256' THEN 'cat-front-128x128'
          WHEN 'Farrot-oblique-512x512' THEN 'Farrot-oblique-128x128'
          ELSE "backgroundAssetKey"
        END
      WHERE "resultTemplateAssetKey" IN (
        'cat-oblique-128x128',
        'cat-front-256x256',
        'Farrot-oblique-512x512'
      )
      OR "backgroundAssetKey" IN (
        'cat-oblique-128x128',
        'cat-front-256x256',
        'Farrot-oblique-512x512'
      )
    `);
  }
}
