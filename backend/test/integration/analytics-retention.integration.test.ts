import { AppDataSource } from "../../src/database/data-source";
import { VisitEventDailyAggregate } from "../../src/entities/visit-event-daily-aggregate.entity";
import {
  resetIntegrationState,
} from "./helpers/integration-runtime";
import {
  VisitDeviceType,
  VisitEvent,
  VisitEventType,
} from "../../src/entities/visit-event.entity";
import { analyticsRetentionService } from "../../src/modules/analytics/analytics-retention.service";
import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

describe("analytics retention integration", () => {
  setupIntegrationSuite();

  const visitEventRepository = AppDataSource.getRepository(VisitEvent);
  const aggregateRepository = AppDataSource.getRepository(VisitEventDailyAggregate);

  beforeEach(async () => {
    await resetIntegrationState();
  });

  it("supports dry-run rollup without changing data", async () => {
    const oldEvent = visitEventRepository.create({
      eventType: VisitEventType.LANDING_VISIT,
      browserLanguage: "ko-KR",
      timeZone: "Asia/Seoul",
      deviceType: VisitDeviceType.DESKTOP,
      enteredAt: new Date("2025-12-31T16:00:00.000Z"),
    });

    await visitEventRepository.save(oldEvent);

    const summary = await analyticsRetentionService.rollupVisitEvents({
      apply: false,
      before: new Date("2026-02-01T00:00:00.000Z"),
    });

    expect(summary.applied).toBe(false);
    expect(summary.eligibleEventCount).toBe(1);
    expect(summary.aggregateGroupCount).toBe(1);
    expect(summary.rolledUpGroupCount).toBe(0);
    expect(summary.markedEventCount).toBe(0);

    expect(await visitEventRepository.count()).toBe(1);
    expect(await aggregateRepository.count()).toBe(0);
  });

  it("rolls up eligible raw events and marks them as rolled up", async () => {
    await visitEventRepository.save([
      visitEventRepository.create({
        eventType: VisitEventType.LANDING_VISIT,
        browserLanguage: "ko-KR",
        timeZone: "Asia/Seoul",
        deviceType: VisitDeviceType.DESKTOP,
        enteredAt: new Date("2025-12-31T16:30:00.000Z"),
      }),
      visitEventRepository.create({
        eventType: VisitEventType.LANDING_VISIT,
        browserLanguage: "ko-KR",
        timeZone: "Asia/Seoul",
        deviceType: VisitDeviceType.DESKTOP,
        enteredAt: new Date("2026-01-01T02:00:00.000Z"),
      }),
      visitEventRepository.create({
        eventType: VisitEventType.ROOM_VISIT,
        browserLanguage: "en-US",
        timeZone: "UTC",
        deviceType: VisitDeviceType.MOBILE,
        enteredAt: new Date("2026-01-02T01:00:00.000Z"),
      }),
      visitEventRepository.create({
        eventType: VisitEventType.ROOM_VISIT,
        browserLanguage: "ko-KR",
        timeZone: "Asia/Seoul",
        deviceType: VisitDeviceType.DESKTOP,
        enteredAt: new Date("2026-03-01T01:00:00.000Z"),
      }),
    ]);

    const summary = await analyticsRetentionService.rollupVisitEvents({
      apply: true,
      before: new Date("2026-02-01T00:00:00.000Z"),
    });

    expect(summary.applied).toBe(true);
    expect(summary.eligibleEventCount).toBe(3);
    expect(summary.aggregateGroupCount).toBe(2);
    expect(summary.rolledUpGroupCount).toBe(2);
    expect(summary.markedEventCount).toBe(3);
    expect(summary.eventCounts).toEqual([
      { eventType: VisitEventType.LANDING_VISIT, count: 2 },
      { eventType: VisitEventType.ROOM_VISIT, count: 1 },
    ]);

    const events = await visitEventRepository.find({
      order: { id: "ASC" },
    });

    expect(events).toHaveLength(4);
    expect(events.slice(0, 3).every((event) => event.rolledUpAt instanceof Date)).toBe(
      true,
    );
    expect(events[3]?.eventType).toBe(VisitEventType.ROOM_VISIT);
    expect(events[3]?.browserLanguage).toBe("ko-KR");
    expect(events[3]?.rolledUpAt).toBeNull();

    const aggregateRows = await aggregateRepository.find({
      order: {
        bucketDate: "ASC",
        eventType: "ASC",
        browserLanguage: "ASC",
      },
    });

    expect(aggregateRows).toHaveLength(2);
    expect(aggregateRows[0]).toMatchObject({
      bucketDate: "2026-01-01",
      eventType: VisitEventType.LANDING_VISIT,
      browserLanguage: "ko-KR",
      timeZone: "Asia/Seoul",
      deviceType: VisitDeviceType.DESKTOP,
      eventCount: 2,
    });
    expect(aggregateRows[1]).toMatchObject({
      bucketDate: "2026-01-02",
      eventType: VisitEventType.ROOM_VISIT,
      browserLanguage: "en-US",
      timeZone: "UTC",
      deviceType: VisitDeviceType.MOBILE,
      eventCount: 1,
    });
  });

  it("deletes only rolled-up raw events that are older than the retention cutoff", async () => {
    await visitEventRepository.save([
      visitEventRepository.create({
        eventType: VisitEventType.LANDING_VISIT,
        browserLanguage: "ko-KR",
        timeZone: "Asia/Seoul",
        deviceType: VisitDeviceType.DESKTOP,
        enteredAt: new Date("2026-01-01T01:00:00.000Z"),
        rolledUpAt: new Date("2026-01-02T00:00:00.000Z"),
      }),
      visitEventRepository.create({
        eventType: VisitEventType.ROOM_VISIT,
        browserLanguage: "en-US",
        timeZone: "UTC",
        deviceType: VisitDeviceType.MOBILE,
        enteredAt: new Date("2026-01-02T01:00:00.000Z"),
        rolledUpAt: null,
      }),
      visitEventRepository.create({
        eventType: VisitEventType.ROOM_VISIT,
        browserLanguage: "ko-KR",
        timeZone: "Asia/Seoul",
        deviceType: VisitDeviceType.DESKTOP,
        enteredAt: new Date("2026-03-01T01:00:00.000Z"),
        rolledUpAt: new Date("2026-03-02T00:00:00.000Z"),
      }),
    ]);

    const summary = await analyticsRetentionService.cleanupVisitEvents({
      apply: true,
      before: new Date("2026-02-01T00:00:00.000Z"),
      retentionDays: 90,
    });

    expect(summary.applied).toBe(true);
    expect(summary.deletableEventCount).toBe(1);
    expect(summary.pendingUnrolledEventCount).toBe(1);
    expect(summary.deletedCount).toBe(1);
    expect(summary.eventCounts).toEqual([
      { eventType: VisitEventType.LANDING_VISIT, count: 1 },
    ]);

    const remainingEvents = await visitEventRepository.find({
      order: { id: "ASC" },
    });

    expect(remainingEvents).toHaveLength(2);
    expect(
      remainingEvents.some(
        (event) =>
          event.eventType === VisitEventType.ROOM_VISIT &&
          event.browserLanguage === "en-US" &&
          event.rolledUpAt === null,
      ),
    ).toBe(true);
    expect(
      remainingEvents.some(
        (event) =>
          event.eventType === VisitEventType.ROOM_VISIT &&
          event.browserLanguage === "ko-KR" &&
          event.rolledUpAt instanceof Date,
      ),
    ).toBe(true);
  });
});
