import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum VisitEventType {
  SITE_VISIT = "site_visit",
  GAME_ENTRY = "game_entry",
}

export enum VisitDeviceType {
  DESKTOP = "desktop",
  MOBILE = "mobile",
  TABLET = "tablet",
  OTHER = "other",
}

@Entity("visit_event")
@Index("IDX_visit_event_type_entered_at", ["eventType", "enteredAt"])
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
}
