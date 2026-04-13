import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Canvas } from "./canvas.entity";
import { VoteRound } from "./vote-round.entity";

@Entity("round_summary")
@Index("IDX_round_summary_canvas_id", ["canvas"])
@Index("IDX_round_summary_round_number", ["roundNumber"])
export class RoundSummary {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Canvas, { onDelete: "CASCADE" }) // 추가: 캔버스 단위 조회용
  @JoinColumn({ name: "canvas_id" })
  canvas!: Canvas;

  @OneToOne(() => VoteRound, { onDelete: "CASCADE" }) // 추가: 라운드당 summary 1개
  @JoinColumn({ name: "round_id" })
  round!: VoteRound;

  @Column({ type: "int", name: "round_number" })
  roundNumber!: number;

  @Column({ type: "int", name: "participant_count", default: 0 })
  participantCount!: number;

  @Column({ type: "int", name: "total_votes", default: 0 })
  totalVotes!: number;

  @Column({ type: "int", name: "painted_cell_count", default: 0 }) // 추가: 이번 라운드에서 반영된 칸 수
  paintedCellCount!: number;

  @Column({ type: "int", name: "total_cell_count", default: 0 })
  totalCellCount!: number;

  @Column({ type: "int", name: "current_painted_cell_count", default: 0 }) // 추가: 라운드 종료 시점 누적 색칠 칸 수
  currentPaintedCellCount!: number;

  @Column({
    type: "decimal",
    name: "canvas_progress_percent",
    precision: 5,
    scale: 2,
    default: 0,
  })
  canvasProgressPercent!: string;

  @Column({ type: "int", name: "most_voted_cell_id", nullable: true }) // 추가: 무투표 라운드면 null 가능
  mostVotedCellId!: number | null;

  @Column({ type: "int", name: "most_voted_cell_x", nullable: true })
  mostVotedCellX!: number | null;

  @Column({ type: "int", name: "most_voted_cell_y", nullable: true })
  mostVotedCellY!: number | null;

  @Column({ type: "int", name: "most_voted_cell_vote_count", default: 0 })
  mostVotedCellVoteCount!: number;

  @Column({ type: "int", name: "random_resolved_cell_count", default: 0 }) // 추가: 동점 추첨으로 결정된 칸 수
  randomResolvedCellCount!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
