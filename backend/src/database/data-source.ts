import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Voter } from "../entities/voter.entity";
import { Canvas } from "../entities/canvas.entity";
import { Cell } from "../entities/cell.entity";
import { VoteRound } from "../entities/vote-round.entity";
import { VoteTicket } from "../entities/vote-ticket.entity";
import { Vote } from "../entities/vote.entity";

import { GameSummary } from "../entities/game-summary.entity"; // 추가: 게임 집계 엔티티
import { RoundSummary } from "../entities/round-summary.entity"; // 추가: 라운드 집계 엔티티

import { RoundSnapshot } from "../entities/round-snapshot.entity";

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
  entities: [
    Canvas,
    Cell,
    Vote,
    VoteRound,
    VoteTicket,
    Voter,
    GameSummary,
    RoundSummary,
    RoundSnapshot,
  ],
  migrations: ["src/database/migrations/*.ts"],
});
