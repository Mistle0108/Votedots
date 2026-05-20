import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCanvasPendingGameEnd1785000000000
  implements MigrationInterface
{
  name = "AddCanvasPendingGameEnd1785000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "canvas"
      ADD COLUMN "pendingGameEnd" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "canvas"
      DROP COLUMN "pendingGameEnd"
    `);
  }
}
