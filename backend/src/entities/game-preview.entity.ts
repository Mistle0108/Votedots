import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Canvas } from "./canvas.entity";
import { GameSummary } from "./game-summary.entity";

export enum GamePreviewStatus {
  READY = "ready",
  FAILED = "failed",
}

export type GamePreviewTopVoter = {
  name: string | null;
  voteCount: number;
};

@Entity("game_preview")
@Index("IDX_game_preview_status_size", ["status", "size"])
@Index("IDX_game_preview_canvas_id", ["canvas"], { unique: true })
@Index("IDX_game_preview_game_summary_id", ["gameSummary"], { unique: true })
export class GamePreview {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Canvas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "canvas_id" })
  canvas!: Canvas;

  @OneToOne(() => GameSummary, { onDelete: "CASCADE" })
  @JoinColumn({ name: "game_summary_id" })
  gameSummary!: GameSummary;

  @Column({ type: "varchar", length: 16 })
  status!: GamePreviewStatus;

  @Column({ type: "varchar", length: 255, name: "storage_path", nullable: true })
  storagePath!: string | null;

  @Column({ type: "varchar", length: 32, name: "mime_type", nullable: true })
  mimeType!: string | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  format!: string | null;

  @Column({ type: "int", nullable: true })
  width!: number | null;

  @Column({ type: "int", nullable: true })
  height!: number | null;

  @Column({ type: "int", name: "byte_size", nullable: true })
  byteSize!: number | null;

  @Column({ type: "int", name: "frame_count", nullable: true })
  frameCount!: number | null;

  @Column({ type: "varchar", length: 32, name: "size_key" })
  size!: string;

  @Column({ type: "int", name: "grid_x" })
  gridX!: number;

  @Column({ type: "int", name: "grid_y" })
  gridY!: number;

  @Column({ type: "timestamptz", name: "ended_at" })
  endedAt!: Date;

  @Column({ type: "int", name: "participant_count", default: 0 })
  participantCount!: number;

  @Column({ type: "simple-json", name: "participants_json", nullable: true })
  participantsJson!: string[] | null;

  @Column({ type: "varchar", length: 100, name: "top_voter_name", nullable: true })
  topVoterName!: string | null;

  @Column({ type: "int", name: "top_voter_vote_count", default: 0 })
  topVoterVoteCount!: number;

  @Column({ type: "int", name: "total_votes", default: 0 })
  totalVotes!: number;

  @Column({ type: "varchar", length: 128, name: "failure_reason", nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
