import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Cell } from './cell.entity';
import { VoteRound } from './vote-round.entity';

export enum CanvasStatus {
  PLAYING = 'playing',
  FINISHED = 'finished',
}

@Entity('canvas')
export class Canvas extends BaseEntity {
  @Column({ type: 'smallint', default: 10 })
  gridX!: number;

  @Column({ type: 'smallint', default: 10 })
  gridY!: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: CanvasStatus.PLAYING,
  })
  status!: CanvasStatus;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => Cell, (cell) => cell.canvas)
  cells!: Cell[];

  @OneToMany(() => VoteRound, (round) => round.canvas)
  voteRounds!: VoteRound[];
}
