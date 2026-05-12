import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoterWithdrawalFields1784600000000
  implements MigrationInterface
{
  name = "AddVoterWithdrawalFields1784600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voter"
      ADD COLUMN "is_withdrawn" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      ADD COLUMN "withdrawn_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voter"
      DROP COLUMN "withdrawn_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      DROP COLUMN "is_withdrawn"
    `);
  }
}
