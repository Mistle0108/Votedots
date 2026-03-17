import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { VoteRound } from './vote-round.entity';
import { Voter } from './voter.entity';
import { Vote } from './vote.entity';

@Entity('vote_ticket')
export class VoteTicket extends BaseEntity {
  @ManyToOne(() => VoteRound, (round) => round.voteTickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'round_id' })
  round!: VoteRound;

  @ManyToOne(() => Voter, (voter) => voter.voteTickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voter_id' })
  voter!: Voter;

  @Column({ type: 'boolean', default: false })
  isUsed!: boolean;

  @OneToOne(() => Vote, (vote) => vote.ticket)
  vote!: Vote | null;
}
