import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Canvas } from "./canvas.entity";
import { Voter } from "./voter.entity";

@Entity("canvas_participant_summary")
@Index("UQ_canvas_participant_summary_canvas_voter", ["canvas", "voter"], {
  unique: true,
})
@Index("IDX_canvas_participant_summary_voter_ended_at", ["voter", "endedAt"])
@Index("IDX_canvas_participant_summary_voter_grid", ["voter", "gridX", "gridY"])
export class CanvasParticipantSummary {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Canvas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "canvas_id" })
  canvas!: Canvas;

  @ManyToOne(() => Voter, { onDelete: "CASCADE" })
  @JoinColumn({ name: "voter_id" })
  voter!: Voter;

  @Column({ type: "int", name: "grid_x" })
  gridX!: number;

  @Column({ type: "int", name: "grid_y" })
  gridY!: number;

  @Column({ type: "int", name: "used_vote_count", default: 0 })
  usedVoteCount!: number;

  @Column({ type: "timestamptz", name: "last_voted_at" })
  lastVotedAt!: Date;

  @Column({ type: "boolean", name: "is_top_voter", default: false })
  isTopVoter!: boolean;

  @Column({ type: "timestamptz", name: "ended_at" })
  endedAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
