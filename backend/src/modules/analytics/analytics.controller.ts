import { Request, Response } from "express";
import { analyticsService } from "./analytics.service";
import { validateTrackVisitEventInput } from "./analytics.validation";

export const analyticsController = {
  async trackVisitEvent(req: Request, res: Response) {
    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};

    const { error, value } = validateTrackVisitEventInput(body);

    if (error || !value) {
      return res.status(400).json({
        message: error ?? "ANALYTICS_INVALID_REQUEST",
      });
    }

    await analyticsService.trackVisitEvent(value);

    return res.status(201).json({ message: "TRACK_VISIT_EVENT_SUCCESS" });
  },
};
