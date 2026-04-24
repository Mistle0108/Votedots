import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Cell } from "./cell.entity";
import { VoteRound } from "./vote-round.entity";
import { GamePhase } from "../modules/game/game-phase.types";
import type { GameConfigSnapshot } from "../config/game.config";

export enum CanvasStatus {
  PLAYING = "playing",
  FINISHED = "finished",
}

@Entity("canvas")
export class Canvas extends BaseEntity {
  @Column({ type: "smallint", default: 10 })
  gridX!: number;

  @Column({ type: "smallint", default: 10 })
  gridY!: number;

  @Column({
    type: "varchar",
    length: 64,
    default: "default",
  })
  configProfileKey!: string;

  @Column({
    type: "varchar",
    length: 128,
    nullable: true,
  })
  backgroundAssetKey!: string | null;

  @Column({
    type: "varchar",
    length: 128,
    nullable: true,
  })
  playBackgroundAssetKey!: string | null;

  @Column({
    type: "varchar",
    length: 128,
    nullable: true,
  })
  resultTemplateAssetKey!: string | null;

  @Column({
    type: "jsonb",
    default: () => "'{}'::jsonb",
  })
  configSnapshot!: GameConfigSnapshot;

  @Column({
    type: "varchar",
    length: 16,
    default: CanvasStatus.PLAYING,
  })
  status!: CanvasStatus;

  @Column({
    type: "varchar",
    length: 24,
    default: GamePhase.ROUND_ACTIVE,
  })
  phase!: GamePhase;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  phaseStartedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  phaseEndsAt!: Date | null;

  @Column({ type: "smallint", default: 0 })
  currentRoundNumber!: number;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  startedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => Cell, (cell) => cell.canvas)
  cells!: Cell[];

  @OneToMany(() => VoteRound, (round) => round.canvas)
  voteRounds!: VoteRound[];
}
