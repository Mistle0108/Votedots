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

export interface MypageParticipationDetailData {
  canvasId: number;
  gridX: number;
  gridY: number;
  size: string;
  endedAt: string;
  participatedAt: string;
  usedVoteCount: number;
  isTopVoter: boolean;
  totalRounds: number;
  participantCount: number;
  totalVotes: number;
  canvasCompletionPercent: string;
  topVoterName: string | null;
  topVoterVoteCount: number;
  hottestRoundNumber: number | null;
  hottestRoundVoteCount: number;
  resultImageUrl: string | null;
  downloadSnapshotUrl: string | null;
  highResolutionDownloadSnapshotUrl: string | null;
  downloadAvailable: boolean;
  highResolutionDownloadAvailable: boolean;
  createdAt: string;
  updatedAt: string;
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
