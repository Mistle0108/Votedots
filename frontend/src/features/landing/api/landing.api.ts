import api from "@/shared/api/client";
import type { LandingPayload } from "../model/landing.types";

export const landingApi = {
  getLandingPayload: () => api.get<LandingPayload>("/public/landing"),
};
