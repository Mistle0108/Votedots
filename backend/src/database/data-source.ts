import "reflect-metadata";
import path from "node:path";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../config/load-env";
import { Voter } from "../entities/voter.entity";
import { Canvas } from "../entities/canvas.entity";
import { Cell } from "../entities/cell.entity";
import { VoteRound } from "../entities/vote-round.entity";
import { RoundVoterState } from "../entities/round-voter-state.entity";
import { VoteTicket } from "../entities/vote-ticket.entity";
import { Vote } from "../entities/vote.entity";
import { GameSummary } from "../entities/game-summary.entity";
import { RoundSummary } from "../entities/round-summary.entity";
import { RoundSnapshot } from "../entities/round-snapshot.entity";

loadEnvironment();

function readNonNegativeIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  connectTimeoutMS: readNonNegativeIntegerEnv("DB_CONNECT_TIMEOUT_MS", 5000),
  poolErrorHandler: (error: Error) => {
    console.error("[db] postgres pool error:", error);
  },
  entities: [
    Canvas,
    Cell,
    Vote,
    VoteRound,
    RoundVoterState,
    VoteTicket,
    Voter,
    GameSummary,
    RoundSummary,
    RoundSnapshot,
  ],
  migrations: [path.join(__dirname, "migrations/*.{js,ts}")],
});
