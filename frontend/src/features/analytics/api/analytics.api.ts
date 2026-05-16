import api from "@/shared/api/client";

export type VisitEventType =
  | "landing_visit"
  | "lobby_visit"
  | "plaza_visit"
  | "room_visit"
  | "public_room_created"
  | "private_room_created";
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
