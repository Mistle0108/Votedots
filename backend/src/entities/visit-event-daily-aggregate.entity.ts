import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { VisitDeviceType, VisitEventType } from "./visit-event.entity";

@Entity("visit_event_daily_aggregate")
@Index("IDX_visit_event_daily_aggregate_bucket_event", ["bucketDate", "eventType"])
@Index(
  "UQ_visit_event_daily_aggregate_bucket_dimensions",
  ["bucketDate", "eventType", "browserLanguage", "timeZone", "deviceType"],
  { unique: true },
)
export class VisitEventDailyAggregate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "date", name: "bucket_date" })
  bucketDate!: string;

  @Column({ type: "varchar", length: 32, name: "event_type" })
  eventType!: VisitEventType;

  @Column({ type: "varchar", length: 32, name: "browser_language" })
  browserLanguage!: string;

  @Column({ type: "varchar", length: 64, name: "time_zone" })
  timeZone!: string;

  @Column({ type: "varchar", length: 16, name: "device_type" })
  deviceType!: VisitDeviceType;

  @Column({ type: "integer", name: "event_count" })
  eventCount!: number;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}
