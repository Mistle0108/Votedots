import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Canvas } from "./canvas.entity";
import { Voter } from "./voter.entity";

export enum RoomType {
  PLAZA = "plaza",
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum RoomStatus {
  ACTIVE = "active",
  GAME_END_WAIT = "game_end_wait",
  EXPIRED = "expired",
}

export enum RoomTerminationReason {
  EXPIRED = "expired",
  TERMINATED_BY_OWNER = "terminated_by_owner",
}

export type RoomSettingsSnapshot = Record<string, unknown>;

@Entity("room")
@Index("UQ_room_public_room_number", ["publicRoomNumber"], { unique: true })
export class Room extends BaseEntity {
  @Column({
    type: "varchar",
    length: 16,
    default: RoomType.PLAZA,
  })
  type!: RoomType;

  @Column({
    type: "varchar",
    length: 24,
    default: RoomStatus.ACTIVE,
  })
  status!: RoomStatus;

  @Column({
    type: "int",
    nullable: true,
  })
  publicRoomNumber!: number | null;

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
  })
  title!: string | null;

  @ManyToOne(() => Voter, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "owner_voter_id" })
  owner!: Voter | null;

  @Column({
    type: "varchar",
    length: 64,
    nullable: true,
  })
  accessCode!: string | null;

  @Column({
    type: "jsonb",
    default: () => "'{}'::jsonb",
  })
  settingsSnapshot!: RoomSettingsSnapshot;

  @OneToOne(() => Canvas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "canvas_id" })
  canvas!: Canvas;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  @Column({
    type: "varchar",
    length: 32,
    nullable: true,
  })
  terminationReason!: RoomTerminationReason | null;
}
