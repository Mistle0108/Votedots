import api from "@/shared/api/client";
import type {
  TicketsResponse,
  VoteStatusResponse,
  VoteSubmitRequest,
} from "../model/vote.types";

export const voteApi = {
  submit: (data: VoteSubmitRequest) =>
    api.post<{ message: string }>("/vote", data),

  getStatus: (roundId: number) =>
    api.get<VoteStatusResponse>(`/vote/rounds/${roundId}/status`),

  getTickets: (roundId: number) =>
    api.get<TicketsResponse>(`/vote/rounds/${roundId}/tickets`),
};
