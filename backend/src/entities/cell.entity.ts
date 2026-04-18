// TO-BE
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Canvas } from "./canvas.entity";

export enum CellStatus {
  PAINTED = "painted",
}

@Entity("cell")
@Unique(["canvas", "x", "y"])
export class Cell extends BaseEntity {
  @ManyToOne(() => Canvas, (canvas) => canvas.cells, { onDelete: "CASCADE" })
  @JoinColumn({ name: "canvas_id" })
  canvas!: Canvas;

  @Column({ type: "smallint" })
  x!: number;

  @Column({ type: "smallint" })
  y!: number;

  @Column({ type: "varchar", length: 7 })
  color!: string;

  @Column({
    type: "varchar",
    length: 16,
    default: CellStatus.PAINTED,
  })
  status!: CellStatus;
}
