import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Canvas } from './canvas.entity';
import { VoteTicket } from './vote-ticket.entity';
import { Vote } from './vote.entity';

@Entity('vote_round')
@Unique(['canvas', 'roundNumber'])
export class VoteRound extends BaseEntity {
  @ManyToOne(() => Canvas, (canvas) => canvas.voteRounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'canvas_id' })
  canvas!: Canvas;

  @Column({ type: 'smallint' })
  roundNumber!: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => VoteTicket, (ticket) => ticket.round)
  voteTickets!: VoteTicket[];

  @OneToMany(() => Vote, (vote) => vote.round)
  votes!: Vote[];
}
