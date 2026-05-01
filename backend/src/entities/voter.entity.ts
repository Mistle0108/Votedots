import { Entity, Column, Generated, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { VoteTicket } from "./vote-ticket.entity";
import { Vote } from "./vote.entity";
import { RoundVoterState } from "./round-voter-state.entity";

export enum VoterRole {
  USER = "user",
  ADMIN = "admin",
}

@Entity("voter")
export class Voter extends BaseEntity {
  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  uuid!: string;

  @Column({ type: "varchar", length: 32, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @Column({ type: "varchar", length: 32 })
  nickname!: string;

  @Column({
    type: "varchar",
    length: 16,
    default: VoterRole.USER,
  })
  role!: VoterRole;

  @OneToMany(() => VoteTicket, (ticket) => ticket.voter)
  voteTickets!: VoteTicket[];

  @OneToMany(() => RoundVoterState, (state) => state.voter)
  roundVoterStates!: RoundVoterState[];

  @OneToMany(() => Vote, (vote) => vote.voter)
  votes!: Vote[];
}
