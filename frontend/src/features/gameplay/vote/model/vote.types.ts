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

export interface VotePopupEntry {
  cellId: number;
  x: number;
  y: number;
  color: string;
  count: number;
}

export interface VotePanelEntry {
  cellId: number;
  x: number;
  y: number;
  topColor: string;
  topCount: number;
  totalCount: number;
}
