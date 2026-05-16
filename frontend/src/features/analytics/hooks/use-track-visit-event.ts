import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { VisitEventType } from "../api/analytics.api";
import { trackVisitEvent } from "../model/visit-event";

function buildPageViewStorageKey(eventType: VisitEventType, locationKey: string) {
  return `votedots:analytics:${eventType}:${locationKey}`;
}

export function useTrackVisitEvent(eventType: VisitEventType) {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = buildPageViewStorageKey(eventType, location.key);

    if (window.sessionStorage.getItem(storageKey) === "sent") {
      return;
    }

    window.sessionStorage.setItem(storageKey, "sent");

    void trackVisitEvent(eventType).catch(() => {
      window.sessionStorage.removeItem(storageKey);
    });
  }, [eventType, location.key]);
}
