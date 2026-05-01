import { Entity, Column, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { VoteRound } from "./vote-round.entity";
import { Voter } from "./voter.entity";
import { VoteTicket } from "./vote-ticket.entity";

@Entity("vote")
export class Vote extends BaseEntity {
  @ManyToOne(() => VoteRound, (round) => round.votes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "round_id" })
  round!: VoteRound;

  @ManyToOne(() => Voter, (voter) => voter.votes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "voter_id" })
  voter!: Voter;

  @OneToOne(() => VoteTicket, (ticket) => ticket.vote, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticket_id" })
  ticket!: VoteTicket | null;

  @Column({ type: "smallint" })
  x!: number;

  @Column({ type: "smallint" })
  y!: number;

  @Column({ type: "varchar", length: 7 })
  color!: string;
}
