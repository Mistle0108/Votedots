import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum VisitEventType {
  LANDING_VISIT = "landing_visit",
  LOBBY_VISIT = "lobby_visit",
  PLAZA_VISIT = "plaza_visit",
  ROOM_VISIT = "room_visit",
  PUBLIC_ROOM_CREATED = "public_room_created",
  PRIVATE_ROOM_CREATED = "private_room_created",
}

export enum VisitDeviceType {
  DESKTOP = "desktop",
  MOBILE = "mobile",
  TABLET = "tablet",
  OTHER = "other",
}

@Entity("visit_event")
@Index("IDX_visit_event_type_entered_at", ["eventType", "enteredAt"])
@Index("IDX_visit_event_rolled_up_at_entered_at", ["rolledUpAt", "enteredAt"])
export class VisitEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 32, name: "event_type" })
  eventType!: VisitEventType;

  @Column({ type: "varchar", length: 32, name: "browser_language" })
  browserLanguage!: string;

  @Column({ type: "varchar", length: 64, name: "time_zone" })
  timeZone!: string;

  @Column({ type: "varchar", length: 16, name: "device_type" })
  deviceType!: VisitDeviceType;

  @CreateDateColumn({ type: "timestamptz", name: "entered_at" })
  enteredAt!: Date;

  @Column({ type: "timestamptz", name: "rolled_up_at", nullable: true })
  rolledUpAt!: Date | null;
}
