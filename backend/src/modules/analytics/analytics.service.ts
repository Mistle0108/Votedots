import { AppDataSource } from "../../database/data-source";
import { VisitEvent } from "../../entities/visit-event.entity";
import type { TrackVisitEventInput } from "./analytics.validation";

const visitEventRepository = AppDataSource.getRepository(VisitEvent);

export const analyticsService = {
  async trackVisitEvent(input: TrackVisitEventInput) {
    const event = visitEventRepository.create({
      eventType: input.eventType,
      browserLanguage: input.browserLanguage,
      timeZone: input.timeZone,
      deviceType: input.deviceType,
    });

    return visitEventRepository.save(event);
  },
};
