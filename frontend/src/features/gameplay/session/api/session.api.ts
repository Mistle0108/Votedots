import api from "@/shared/api/client";
import type { Canvas } from "@/features/gameplay/canvas";
import { voteApi } from "@/features/gameplay/vote/api/vote.api";
import type { GameConfig } from "@/shared/config/game-config";
import type { GamePhase } from "../model/game-phase.types";

export interface CanvasCurrentResponse {
  canvas: Canvas;
  gameConfig: GameConfig;
}

export interface RoundStateResponse {
  status: "active" | "waiting";
  canvasPhase: GamePhase;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  round: {
    id: number;
    roundNumber: number;
    startedAt: string;
    endedAt: string | null;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
  timer: {
    remainingSeconds: number;
    isRoundExpired: boolean;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
}

export interface ParticipantCountResponse {
  count: number;
}

export type ParticipantStatus = "voting" | "waiting";

export interface ParticipantItem {
  sessionId: string;
  voterUuid: string;
  nickname: string;
  status: ParticipantStatus;
  selectedCell: {
    x: number;
    y: number;
  } | null;
}

export interface ParticipantListResponse {
  participants: ParticipantItem[];
}

export interface RoundSummaryData {
  id: number;
  canvasId: number;
  roundId: number;
  roundNumber: number;
  participantCount: number;
  totalVotes: number;
  paintedCellCount: number;
  totalCellCount: number;
  currentPaintedCellCount: number;
  canvasProgressPercent: string;
  mostVotedCellId: number | null;
  mostVotedCellX: number | null;
  mostVotedCellY: number | null;
  mostVotedCellVoteCount: number;
  randomResolvedCellCount: number;
  createdAt: string;
  updatedAt: string;
  snapshotUrl: string | null;
}

export interface GameSummaryTopVoter {
  voterId: number;
  name: string;
  voteCount: number;
}

export interface GameSummaryParticipant {
  voterId: number;
  name: string;
}

export interface GameSummaryData {
  id: number;
  canvasId: number;
  totalRounds: number;
  participantCount: number;
  issuedTicketCount: number;
  totalVotes: number;
  ticketUsageRate: string;
  totalCellCount: number;
  paintedCellCount: number;
  emptyCellCount: number;
  canvasCompletionPercent: string;
  mostVotedCellId: number | null;
  mostVotedCellX: number | null;
  mostVotedCellY: number | null;
  mostVotedCellVoteCount: number;
  randomResolvedCellCount: number;
  usedColorCount: number;
  mostSelectedColor: string | null;
  mostSelectedColorVoteCount: number;
  mostPaintedColor: string | null;
  mostPaintedColorCellCount: number;
  topVoterId: number | null;
  topVoterName: string | null;
  topVoterVoteCount: number;
  hottestRoundId: number | null;
  hottestRoundNumber: number | null;
  hottestRoundVoteCount: number;
  topVoters: GameSummaryTopVoter[] | null;
  participants: GameSummaryParticipant[] | null;
  snapshotUrl: string | null;
  downloadSnapshotUrl: string | null;
  highResolutionDownloadSnapshotUrl: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoundSummaryResponse {
  data: RoundSummaryData;
}

export interface GameSummaryResponse {
  data: GameSummaryData;
}

export interface CreateCanvasRequest {
  profileKey?: string;
}

export const sessionApi = {
  getCurrentCanvas: () => api.get<CanvasCurrentResponse>("/canvas/current"),

  getActiveRound: (canvasId: number) =>
    api.get<RoundStateResponse>(`/canvas/${canvasId}/rounds/active`),

  getRoundSummary: (canvasId: number, roundId: number) =>
    api.get<RoundSummaryResponse>(
      `/canvas/${canvasId}/rounds/${roundId}/summary`,
    ),

  getGameSummary: (canvasId: number) =>
    api.get<GameSummaryResponse>(`/canvas/${canvasId}/summary`),

  getTickets: (roundId: number) => voteApi.getTickets(roundId),

  getVoteStatus: (roundId: number) => voteApi.getStatus(roundId),

  getCurrentParticipantCount: () =>
    api.get<ParticipantCountResponse>("/canvas/current/participants/count"),

  getCurrentParticipantList: () =>
    api.get<ParticipantListResponse>("/canvas/current/participants"),

  createCanvas: (payload?: CreateCanvasRequest) => api.post("/canvas", payload),
};
