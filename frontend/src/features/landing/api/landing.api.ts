import api from "@/shared/api/client";
import type {
  LandingCompletedPreviewDetail,
  LandingFeaturedPreviewPayload,
  LandingPayload,
} from "../model/landing.types";

export const landingApi = {
  getLandingPayload: () => api.get<LandingPayload>("/public/landing"),
  getLandingPreviews: () =>
    api.get<LandingFeaturedPreviewPayload>("/public/landing/previews"),
  getCompletedPreviews: (params: {
    scope: "plaza" | "public";
    dateFrom: string;
    dateTo: string;
    page?: number;
    limit?: number;
    sort?: "latest" | "oldest";
  }) =>
    api.get<LandingFeaturedPreviewPayload>("/public/landing/completed", {
      params,
    }),
  getCompletedPreviewDetail: (canvasId: number) =>
    api.get<LandingCompletedPreviewDetail>(
      `/public/landing/completed/${canvasId}`,
    ),
};
