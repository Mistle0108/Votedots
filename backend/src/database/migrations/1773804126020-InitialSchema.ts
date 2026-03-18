import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1773804126020 implements MigrationInterface {
    name = 'InitialSchema1773804126020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "vote" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" integer, "updatedBy" integer, "color" character varying(7) NOT NULL, "round_id" integer, "cell_id" integer, "voter_id" integer, "ticket_id" integer, CONSTRAINT "REL_8d4b6244d5f13ca64e63f2fddc" UNIQUE ("ticket_id"), CONSTRAINT "PK_2d5932d46afe39c8176f9d4be72" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cell" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" integer, "updatedBy" integer, "x" smallint NOT NULL, "y" smallint NOT NULL, "color" character varying(7), "status" character varying(16) NOT NULL DEFAULT 'idle', "canvas_id" integer, CONSTRAINT "UQ_2096db6821ef74928fa8a0aaa63" UNIQUE ("canvas_id", "x", "y"), CONSTRAINT "PK_6f34717c251843e5ca32fc1b2b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "canvas" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" integer, "updatedBy" integer, "gridX" smallint NOT NULL DEFAULT '10', "gridY" smallint NOT NULL DEFAULT '10', "status" character varying(16) NOT NULL DEFAULT 'playing', "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "endedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0f87c183b39aec0e115707e10a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vote_round" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" integer, "updatedBy" integer, "roundNumber" smallint NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "endedAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "canvas_id" integer, CONSTRAINT "UQ_0f40f88369a799105bdf1fe715b" UNIQUE ("canvas_id", "roundNumber"), CONSTRAINT "PK_c1a41ebe9270e8c456429b811bb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vote_ticket" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" integer, "updatedBy" integer, "isUsed" boolean NOT NULL DEFAULT false, "round_id" integer, "voter_id" integer, CONSTRAINT "PK_8d4b6244d5f13ca64e63f2fddc0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "voter" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" integer, "updatedBy" integer, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(32) NOT NULL, "password" character varying(255) NOT NULL, "nickname" character varying(32) NOT NULL, "role" character varying(16) NOT NULL DEFAULT 'user', CONSTRAINT "UQ_c1d5f09b4ee54f45cbe00039ceb" UNIQUE ("uuid"), CONSTRAINT "UQ_e43b19f3dc9302c1fd4e9bd5cbe" UNIQUE ("username"), CONSTRAINT "PK_c1a0d8fd992c199219325d43705" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "vote" ADD CONSTRAINT "FK_c1a41ebe9270e8c456429b811bb" FOREIGN KEY ("round_id") REFERENCES "vote_round"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote" ADD CONSTRAINT "FK_5536ea10018d23829076af660ad" FOREIGN KEY ("cell_id") REFERENCES "cell"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote" ADD CONSTRAINT "FK_f5c90d8438424ec0f044ef945a9" FOREIGN KEY ("voter_id") REFERENCES "voter"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote" ADD CONSTRAINT "FK_8d4b6244d5f13ca64e63f2fddc0" FOREIGN KEY ("ticket_id") REFERENCES "vote_ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cell" ADD CONSTRAINT "FK_8f3290258e633c147387140401c" FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote_round" ADD CONSTRAINT "FK_1385c20671126488e98d5467d06" FOREIGN KEY ("canvas_id") REFERENCES "canvas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote_ticket" ADD CONSTRAINT "FK_f6333de072a1ea5bfad01b4f842" FOREIGN KEY ("round_id") REFERENCES "vote_round"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vote_ticket" ADD CONSTRAINT "FK_dbab4aa93d2e5436c607463f09c" FOREIGN KEY ("voter_id") REFERENCES "voter"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vote_ticket" DROP CONSTRAINT "FK_dbab4aa93d2e5436c607463f09c"`);
        await queryRunner.query(`ALTER TABLE "vote_ticket" DROP CONSTRAINT "FK_f6333de072a1ea5bfad01b4f842"`);
        await queryRunner.query(`ALTER TABLE "vote_round" DROP CONSTRAINT "FK_1385c20671126488e98d5467d06"`);
        await queryRunner.query(`ALTER TABLE "cell" DROP CONSTRAINT "FK_8f3290258e633c147387140401c"`);
        await queryRunner.query(`ALTER TABLE "vote" DROP CONSTRAINT "FK_8d4b6244d5f13ca64e63f2fddc0"`);
        await queryRunner.query(`ALTER TABLE "vote" DROP CONSTRAINT "FK_f5c90d8438424ec0f044ef945a9"`);
        await queryRunner.query(`ALTER TABLE "vote" DROP CONSTRAINT "FK_5536ea10018d23829076af660ad"`);
        await queryRunner.query(`ALTER TABLE "vote" DROP CONSTRAINT "FK_c1a41ebe9270e8c456429b811bb"`);
        await queryRunner.query(`DROP TABLE "voter"`);
        await queryRunner.query(`DROP TABLE "vote_ticket"`);
        await queryRunner.query(`DROP TABLE "vote_round"`);
        await queryRunner.query(`DROP TABLE "canvas"`);
        await queryRunner.query(`DROP TABLE "cell"`);
        await queryRunner.query(`DROP TABLE "vote"`);
    }

}
