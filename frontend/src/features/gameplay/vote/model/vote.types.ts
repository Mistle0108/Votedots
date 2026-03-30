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

export interface VoteEntry {
  cellId: number;
  x: number;
  y: number;
  color: string;
  count: number;
}

export interface VoteBoardEntry {
  cellId: number;
  x: number;
  y: number;
  topColor: string;
  topCount: number;
  totalCount: number;
}

export interface VotePopupPosition {
  x: number;
  y: number;
}

export interface VotePopupState {
  open: boolean;
  position: VotePopupPosition;
}

export interface VoteState {
  votes: Record<string, number>;
  remaining: number | null;
  votingCellIds: Set<number>;
  topColorMap: Map<number, string>;
  previewColor: string | null;
}
