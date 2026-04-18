export interface VoteSubmitRequest {
  canvasId: number;
  roundId: number;
  x: number;
  y: number;
  color: string;
}

export interface VoteStatusResponse {
  status: Record<string, number>;
}

export interface TicketsResponse {
  remaining: number;
}

export interface VotePanelEntry {
  x: number;
  y: number;
  topColor: string;
  topCount: number;
  totalCount: number;
}
