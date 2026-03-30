export type RoundStatus = "active" | "waiting";

export interface RoundInfo {
  id: number;
  roundNumber: number;
  startedAt: string;
  endedAt: string | null;
  roundDurationSec: number;
  totalRounds: number;
  gameEndAt: string;
}

export interface RoundTimer {
  remainingSeconds: number;
  isRoundExpired: boolean;
  roundDurationSec: number;
  totalRounds: number;
  gameEndAt: string;
}

export interface RoundStateResponse {
  status: RoundStatus;
  round: RoundInfo;
  timer: RoundTimer;
}
