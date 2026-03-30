import api from "@/shared/api/client";

export interface VoteSubmitRequest {
  canvasId: number;
  roundId: number;
  cellId: number;
  color: string;
}

export interface VoteStatusResponse {
  status: Record<string, number>;
}

export interface TicketsResponse {
  remaining: number;
}

export const voteApi = {
  submit: (data: VoteSubmitRequest) =>
    api.post<{ message: string }>("/vote", data),

  getStatus: (roundId: number) =>
    api.get<VoteStatusResponse>(`/vote/rounds/${roundId}/status`),

  getTickets: (roundId: number) =>
    api.get<TicketsResponse>(`/vote/rounds/${roundId}/tickets`),
};
