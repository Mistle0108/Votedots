import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRegisterConsentFieldsToVoter1784300000000
  implements MigrationInterface
{
  name = "AddRegisterConsentFieldsToVoter1784300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voter"
      ADD COLUMN "termsAcceptedAt" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      ADD COLUMN "termsAcceptedLocale" character varying(8)
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      ADD COLUMN "termsVersion" character varying(32)
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      ADD COLUMN "isAge14OrOlderConfirmed" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voter"
      DROP COLUMN "isAge14OrOlderConfirmed"
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      DROP COLUMN "termsVersion"
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      DROP COLUMN "termsAcceptedLocale"
    `);

    await queryRunner.query(`
      ALTER TABLE "voter"
      DROP COLUMN "termsAcceptedAt"
    `);
  }
}
