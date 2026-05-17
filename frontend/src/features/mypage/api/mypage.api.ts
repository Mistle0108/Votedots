import api from "@/shared/api/client";
import type {
  MypageParticipationDetailResponse,
  MypageParticipationsResponse,
  MypageStatsResponse,
} from "../model/mypage.types";

export interface GetParticipationsParams {
  page?: number;
  limit?: number;
  size?: string;
}

export const mypageApi = {
  getParticipations: (params?: GetParticipationsParams) =>
    api.get<MypageParticipationsResponse>("/mypage/participations", { params }),

  getParticipationDetail: (canvasId: number) =>
    api.get<MypageParticipationDetailResponse>(
      `/mypage/participations/${canvasId}`,
    ),

  getStats: () => api.get<MypageStatsResponse>("/mypage/stats"),
};
