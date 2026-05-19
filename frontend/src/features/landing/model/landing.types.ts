import type { CanvasResultDetailBase } from "@/features/canvas-result/model/canvas-result.types";

export interface LandingCurrentGame {
  canvasId: number;
  gridX: number;
  gridY: number;
  currentRoundNumber: number;
  totalRounds: number;
  participantCount: number;
  snapshotUrl: string | null;
  fallbackImageUrl: string | null;
}

export interface LandingParticipant {
  voterId: number | null;
  name: string;
}

export interface LandingTopVoterSummary {
  voterId: number | null;
  name: string;
  voteCount: number;
}

export interface LandingFeaturedGameSummary {
  canvasId: number;
  totalRounds: number;
  participantCount: number;
  totalVotes: number;
  canvasCompletionPercent: string;
  topVoterName: string | null;
  topVoterVoteCount: number;
  topVoters: LandingTopVoterSummary[] | null;
  participants: LandingParticipant[] | null;
  endedAt: string | null;
  snapshotUrl: string | null;
}

export interface LandingFeaturedGameCard {
  profileKey: string;
  gridX: number;
  gridY: number;
  state: "empty" | "ready";
  fallbackImageUrl: string | null;
  game: LandingFeaturedGameSummary | null;
}

export interface LandingPayload {
  currentGame: LandingCurrentGame | null;
  featuredGames: LandingFeaturedGameCard[];
}

export interface LandingFeaturedPreviewTopVoter {
  name: string | null;
  voteCount: number;
}

export interface LandingFeaturedPreviewMeta {
  canvasId?: number;
  size: string;
  gridX: number;
  gridY: number;
  endedAt: string;
  participantCount: number;
  participants: string[];
  topVoter: LandingFeaturedPreviewTopVoter;
  totalVotes: number;
}

export interface LandingFeaturedPreviewItem {
  webpUrl: string;
  resultImageUrl?: string | null;
  downloadAvailable?: boolean;
  downloadSnapshotUrl?: string | null;
  highResolutionDownloadSnapshotUrl?: string | null;
  preview: LandingFeaturedPreviewMeta;
}

export interface LandingFeaturedPreviewPayload {
  items: LandingFeaturedPreviewItem[];
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface LandingCompletedPreviewDetail extends CanvasResultDetailBase {}
