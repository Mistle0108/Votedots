import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Voter } from "../entities/voter.entity";
import { Canvas } from "../entities/canvas.entity";
import { Cell } from "../entities/cell.entity";
import { VoteRound } from "../entities/vote-round.entity";
import { VoteTicket } from "../entities/vote-ticket.entity";
import { Vote } from "../entities/vote.entity";

function readNonNegativeIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  connectTimeoutMS: readNonNegativeIntegerEnv("DB_CONNECT_TIMEOUT_MS", 5000),
  poolErrorHandler: (error: Error) => {
    console.error("[db] postgres pool error:", error);
  },
  entities: [Voter, Canvas, Cell, VoteRound, VoteTicket, Vote],
  migrations: ["src/database/migrations/*.ts"],
});
