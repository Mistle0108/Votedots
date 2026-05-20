import type { CanvasResultDetailBase } from "@/features/canvas-result/model/canvas-result.types";

export interface MypagePagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface MypageParticipationItem {
  canvasId: number;
  gridX: number;
  gridY: number;
  size: string;
  endedAt: string;
  participatedAt: string;
  usedVoteCount: number;
  isTopVoter: boolean;
  resultImageUrl: string | null;
}

export interface MypageParticipationsResponse {
  items: MypageParticipationItem[];
  pagination: MypagePagination;
}

export interface MypageParticipationDetailData extends CanvasResultDetailBase {
  gridX: number;
  gridY: number;
  participatedAt: string;
  usedVoteCount: number;
  isTopVoter: boolean;
  canvasCompletionPercent: string;
  hottestRoundNumber: number | null;
  hottestRoundVoteCount: number;
}

export interface MypageParticipationDetailResponse {
  participation: MypageParticipationDetailData;
}

export interface MypageStatsBySizeItem {
  size: string;
  gridX: number;
  gridY: number;
  count: number;
}

export interface MypageStats {
  totalParticipatedCanvasCount: number;
  totalUsedVoteCount: number;
  topVoterAchievedCount: number;
  participationCountBySize: MypageStatsBySizeItem[];
}

export interface MypageStatsResponse {
  stats: MypageStats;
}
