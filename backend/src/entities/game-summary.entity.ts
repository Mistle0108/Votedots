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

type TopVoterSummary = {
  voterId: number;
  name: string;
  voteCount: number;
};

type ParticipantSummary = {
  voterId: number;
  name: string;
};

@Entity("game_summary")
@Index("IDX_game_summary_canvas_id", ["canvas"], { unique: true })
export class GameSummary {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Canvas, { onDelete: "CASCADE" }) // 추가: 캔버스당 게임 summary 1개
  @JoinColumn({ name: "canvas_id" })
  canvas!: Canvas;

  @Column({ type: "int", name: "total_rounds", default: 0 })
  totalRounds!: number;

  @Column({ type: "int", name: "participant_count", default: 0 })
  participantCount!: number;

  @Column({ type: "int", name: "issued_ticket_count", default: 0 })
  issuedTicketCount!: number;

  @Column({ type: "int", name: "total_votes", default: 0 })
  totalVotes!: number;

  @Column({
    type: "decimal",
    name: "ticket_usage_rate",
    precision: 5,
    scale: 2,
    default: 0,
  })
  ticketUsageRate!: string;

  @Column({ type: "int", name: "total_cell_count", default: 0 })
  totalCellCount!: number;

  @Column({ type: "int", name: "painted_cell_count", default: 0 })
  paintedCellCount!: number;

  @Column({ type: "int", name: "empty_cell_count", default: 0 })
  emptyCellCount!: number;

  @Column({
    type: "decimal",
    name: "canvas_completion_percent",
    precision: 5,
    scale: 2,
    default: 0,
  })
  canvasCompletionPercent!: string;

  @Column({ type: "int", name: "most_voted_cell_id", nullable: true }) // 추가: 전체 무투표면 null 가능
  mostVotedCellId!: number | null;

  @Column({ type: "int", name: "most_voted_cell_x", nullable: true })
  mostVotedCellX!: number | null;

  @Column({ type: "int", name: "most_voted_cell_y", nullable: true })
  mostVotedCellY!: number | null;

  @Column({ type: "int", name: "most_voted_cell_vote_count", default: 0 })
  mostVotedCellVoteCount!: number;

  @Column({ type: "int", name: "random_resolved_cell_count", default: 0 })
  randomResolvedCellCount!: number;

  @Column({ type: "int", name: "used_color_count", default: 0 })
  usedColorCount!: number;

  @Column({
    type: "varchar",
    length: 32,
    name: "most_selected_color",
    nullable: true,
  })
  mostSelectedColor!: string | null;

  @Column({ type: "int", name: "most_selected_color_vote_count", default: 0 })
  mostSelectedColorVoteCount!: number;

  @Column({
    type: "varchar",
    length: 32,
    name: "most_painted_color",
    nullable: true,
  })
  mostPaintedColor!: string | null;

  @Column({ type: "int", name: "most_painted_color_cell_count", default: 0 })
  mostPaintedColorCellCount!: number;

  @Column({ type: "int", name: "top_voter_id", nullable: true })
  topVoterId!: number | null;

  @Column({
    type: "varchar",
    length: 100,
    name: "top_voter_name",
    nullable: true,
  })
  topVoterName!: string | null;

  @Column({ type: "int", name: "top_voter_vote_count", default: 0 })
  topVoterVoteCount!: number;

  @Column({ type: "int", name: "hottest_round_id", nullable: true })
  hottestRoundId!: number | null;

  @Column({ type: "int", name: "hottest_round_number", nullable: true })
  hottestRoundNumber!: number | null;

  @Column({ type: "int", name: "hottest_round_vote_count", default: 0 })
  hottestRoundVoteCount!: number;

  @Column({ type: "simple-json", name: "top_voters_json", nullable: true }) // 추가: 상위 투표자 목록
  topVotersJson!: TopVoterSummary[] | null;

  @Column({ type: "simple-json", name: "participants_json", nullable: true }) // 추가: 함께한 투표자 목록
  participantsJson!: ParticipantSummary[] | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
