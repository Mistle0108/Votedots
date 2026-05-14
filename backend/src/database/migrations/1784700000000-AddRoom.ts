import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoom1784700000000 implements MigrationInterface {
  name = "AddRoom1784700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "room" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" integer,
        "updatedBy" integer,
        "type" character varying(16) NOT NULL DEFAULT 'plaza',
        "status" character varying(24) NOT NULL DEFAULT 'active',
        "publicRoomNumber" integer,
        "title" character varying(100),
        "owner_voter_id" integer,
        "accessCode" character varying(64),
        "settingsSnapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "canvas_id" integer,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "terminationReason" character varying(32),
        CONSTRAINT "UQ_room_public_room_number" UNIQUE ("publicRoomNumber"),
        CONSTRAINT "UQ_room_canvas_id" UNIQUE ("canvas_id"),
        CONSTRAINT "PK_room_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_type_status"
      ON "room" ("type", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_owner_voter_id"
      ON "room" ("owner_voter_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "room"
      ADD CONSTRAINT "FK_room_owner_voter_id"
      FOREIGN KEY ("owner_voter_id") REFERENCES "voter"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room"
      ADD CONSTRAINT "FK_room_canvas_id"
      FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room" DROP CONSTRAINT "FK_room_canvas_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "room" DROP CONSTRAINT "FK_room_owner_voter_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_room_owner_voter_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_room_type_status"
    `);

    await queryRunner.query(`
      DROP TABLE "room"
    `);
  }
}
