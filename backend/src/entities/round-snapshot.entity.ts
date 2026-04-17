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

@Entity("round_snapshot")
@Index("IDX_round_snapshot_canvas_id", ["canvas"])
@Index("UQ_round_snapshot_round_id", ["round"], { unique: true })
@Index("UQ_round_snapshot_canvas_round_number", ["canvas", "roundNumber"], {
  unique: true,
})
export class RoundSnapshot {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Canvas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "canvas_id" })
  canvas!: Canvas;

  @OneToOne(() => VoteRound, { onDelete: "CASCADE" })
  @JoinColumn({ name: "round_id" })
  round!: VoteRound;

  @Column({ type: "int", name: "round_number" })
  roundNumber!: number;

  @Column({ type: "varchar", length: 255, name: "storage_path" })
  storagePath!: string;

  @Column({ type: "varchar", length: 32, name: "mime_type" })
  mimeType!: string;

  @Column({ type: "varchar", length: 16, name: "format" })
  format!: string;

  @Column({ type: "int", name: "width" })
  width!: number;

  @Column({ type: "int", name: "height" })
  height!: number;

  @Column({ type: "int", name: "byte_size" })
  byteSize!: number;

  @CreateDateColumn({ type: "timestamptz", name: "captured_at" })
  capturedAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}
