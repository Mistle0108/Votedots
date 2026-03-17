import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Canvas } from './canvas.entity';
import { Vote } from './vote.entity';

export enum CellStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  PAINTED = 'painted',
  LOCKED = 'locked',
}

@Entity('cell')
@Unique(['canvas', 'x', 'y'])
export class Cell extends BaseEntity {
  @ManyToOne(() => Canvas, (canvas) => canvas.cells, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'canvas_id' })
  canvas!: Canvas;

  @Column({ type: 'smallint' })
  x!: number;

  @Column({ type: 'smallint' })
  y!: number;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color!: string | null;              // HEX (ex: "#7F77DD"), NULL = 미칠해짐

  @Column({
    type: 'varchar',
    length: 16,
    default: CellStatus.IDLE,
  })
  status!: CellStatus;

  @OneToMany(() => Vote, (vote) => vote.cell)
  votes!: Vote[];
}
