import { AppDataSource } from "../../src/database/data-source";
import {
  VisitDeviceType,
  VisitEvent,
  VisitEventType,
} from "../../src/entities/visit-event.entity";
import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

describe("analytics integration", () => {
  const suite = setupIntegrationSuite();
  const visitEventRepository = AppDataSource.getRepository(VisitEvent);

  it("stores a landing visit event", async () => {
    const response = await suite.request().post("/analytics/events").send({
      eventType: "landing_visit",
      browserLanguage: "ko-KR",
      timeZone: "Asia/Seoul",
      deviceType: "desktop",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: "TRACK_VISIT_EVENT_SUCCESS" });

    const event = await visitEventRepository.findOneByOrFail({
      eventType: VisitEventType.LANDING_VISIT,
    });

    expect(event.browserLanguage).toBe("ko-KR");
    expect(event.timeZone).toBe("Asia/Seoul");
    expect(event.deviceType).toBe(VisitDeviceType.DESKTOP);
    expect(event.enteredAt).toBeInstanceOf(Date);
  });

  it("rejects an invalid analytics event", async () => {
    const response = await suite.request().post("/analytics/events").send({
      eventType: "login_page_view",
      browserLanguage: "ko-KR",
      timeZone: "Asia/Seoul",
      deviceType: "desktop",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "ANALYTICS_INVALID_EVENT_TYPE",
    });
  });
});
