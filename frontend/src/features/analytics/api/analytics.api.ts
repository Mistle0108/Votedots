import api from "@/shared/api/client";

export type VisitEventType = "site_visit" | "game_entry";
export type VisitDeviceType = "desktop" | "mobile" | "tablet" | "other";

export interface TrackVisitEventRequest {
  eventType: VisitEventType;
  browserLanguage: string;
  timeZone: string;
  deviceType: VisitDeviceType;
}

export const analyticsApi = {
  trackVisitEvent: (data: TrackVisitEventRequest) =>
    api.post<{ message: string }>("/analytics/events", data),
};
