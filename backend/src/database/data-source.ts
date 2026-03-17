import "reflect-metadata";
import { DataSource } from "typeorm";
import { Voter } from "../entities/voter.entity";
import { Canvas } from "../entities/canvas.entity";
import { Cell } from "../entities/cell.entity";
import { VoteRound } from "../entities/vote-round.entity";
import { VoteTicket } from "../entities/vote-ticket.entity";
import { Vote } from "../entities/vote.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [Voter, Canvas, Cell, VoteRound, VoteTicket, Vote],
  migrations: ["src/database/migrations/*.ts"],
});
