import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { VoteRound } from "./vote-round.entity";
import { Voter } from "./voter.entity";

@Entity("round_voter_state")
@Unique(["round", "voter"])
export class RoundVoterState extends BaseEntity {
  @ManyToOne(() => VoteRound, (round) => round.roundVoterStates, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "round_id" })
  round!: VoteRound;

  @ManyToOne(() => Voter, (voter) => voter.roundVoterStates, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "voter_id" })
  voter!: Voter;

  @Column({ type: "integer", name: "issued_votes", default: 0 })
  issuedVotes!: number;

  @Column({ type: "integer", name: "used_votes", default: 0 })
  usedVotes!: number;
}
