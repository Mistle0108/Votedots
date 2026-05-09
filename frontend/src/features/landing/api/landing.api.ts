import api from "@/shared/api/client";
import type {
  LandingFeaturedPreviewPayload,
  LandingPayload,
} from "../model/landing.types";

export const landingApi = {
  getLandingPayload: () => api.get<LandingPayload>("/public/landing"),
  getLandingPreviews: () =>
    api.get<LandingFeaturedPreviewPayload>("/public/landing/previews"),
};
