import { VisitDeviceType, VisitEventType } from "../../entities/visit-event.entity";

export const ANALYTICS_ERROR_MESSAGES = {
  INVALID_EVENT_TYPE: "ANALYTICS_INVALID_EVENT_TYPE",
  INVALID_BROWSER_LANGUAGE: "ANALYTICS_INVALID_BROWSER_LANGUAGE",
  INVALID_TIME_ZONE: "ANALYTICS_INVALID_TIME_ZONE",
  INVALID_DEVICE_TYPE: "ANALYTICS_INVALID_DEVICE_TYPE",
} as const;

const BROWSER_LANGUAGE_REGEX = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const TIME_ZONE_REGEX = /^[A-Za-z_+-]+(?:\/[A-Za-z0-9_\-+]+)*$/;

const ALLOWED_EVENT_TYPES = new Set<string>(Object.values(VisitEventType));
const ALLOWED_DEVICE_TYPES = new Set<string>(Object.values(VisitDeviceType));

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export interface TrackVisitEventInput {
  eventType: VisitEventType;
  browserLanguage: string;
  timeZone: string;
  deviceType: VisitDeviceType;
}

export function validateTrackVisitEventInput(
  input: Record<string, unknown>,
): { error: string | null; value: TrackVisitEventInput | null } {
  const eventType = input["eventType"];
  const browserLanguage = input["browserLanguage"];
  const timeZone = input["timeZone"];
  const deviceType = input["deviceType"];

  if (!isNonEmptyString(eventType) || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return {
      error: ANALYTICS_ERROR_MESSAGES.INVALID_EVENT_TYPE,
      value: null,
    };
  }

  if (
    !isNonEmptyString(browserLanguage) ||
    browserLanguage.length > 32 ||
    !BROWSER_LANGUAGE_REGEX.test(browserLanguage)
  ) {
    return {
      error: ANALYTICS_ERROR_MESSAGES.INVALID_BROWSER_LANGUAGE,
      value: null,
    };
  }

  if (
    !isNonEmptyString(timeZone) ||
    timeZone.length > 64 ||
    !TIME_ZONE_REGEX.test(timeZone)
  ) {
    return {
      error: ANALYTICS_ERROR_MESSAGES.INVALID_TIME_ZONE,
      value: null,
    };
  }

  if (!isNonEmptyString(deviceType) || !ALLOWED_DEVICE_TYPES.has(deviceType)) {
    return {
      error: ANALYTICS_ERROR_MESSAGES.INVALID_DEVICE_TYPE,
      value: null,
    };
  }

  return {
    error: null,
    value: {
      eventType: eventType as VisitEventType,
      browserLanguage: browserLanguage.trim(),
      timeZone: timeZone.trim(),
      deviceType: deviceType as VisitDeviceType,
    },
  };
}
