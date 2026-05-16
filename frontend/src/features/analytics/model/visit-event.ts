import type {
  TrackVisitEventRequest,
  VisitDeviceType,
  VisitEventType,
} from "../api/analytics.api";
import { analyticsApi } from "../api/analytics.api";

function resolveDeviceType(userAgent: string): VisitDeviceType {
  const normalizedUserAgent = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/.test(normalizedUserAgent)) {
    return "tablet";
  }

  if (/mobi|iphone|ipod|android/.test(normalizedUserAgent)) {
    return "mobile";
  }

  if (
    normalizedUserAgent.includes("windows") ||
    normalizedUserAgent.includes("macintosh") ||
    normalizedUserAgent.includes("linux")
  ) {
    return "desktop";
  }

  return "other";
}

export function buildVisitEventPayload(
  eventType: VisitEventType,
): TrackVisitEventRequest {
  const browserLanguage =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "en";
  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";
  const userAgent =
    typeof navigator !== "undefined" && navigator.userAgent
      ? navigator.userAgent
      : "";

  return {
    eventType,
    browserLanguage,
    timeZone,
    deviceType: resolveDeviceType(userAgent),
  };
}

export async function trackVisitEvent(eventType: VisitEventType) {
  return analyticsApi.trackVisitEvent(buildVisitEventPayload(eventType));
}
