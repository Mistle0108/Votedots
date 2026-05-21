import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGuestFlagToVoter1785100000000
  implements MigrationInterface
{
  name = "AddGuestFlagToVoter1785100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voter"
      ADD COLUMN "is_guest" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voter"
      DROP COLUMN "is_guest"
    `);
  }
}
