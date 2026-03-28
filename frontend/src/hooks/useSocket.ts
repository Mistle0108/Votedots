import { useEffect } from "react";
import socket from "@/lib/socket";

interface RoundStartedPayload {
  roundId: number;
  roundNumber: number;
  startedAt: string;
  roundDurationSec: number;
  totalRounds: number;
  gameEndAt: string;
}

interface RoundEndedPayload {
  roundId: number;
  roundNumber: number;
  endedAt: string;
  winningCell: { id: number; x: number; y: number; color: string } | null;
}

interface CanvasUpdatedPayload {
  cellId: number;
  x: number;
  y: number;
  color: string;
}

interface VoteUpdatePayload {
  roundId: number;
  cellId: number;
  color: string;
  votes: Record<string, number>;
}

interface TimerUpdatePayload {
  roundId: number;
  roundNumber: number;
  remainingSeconds: number;
  isRoundExpired: boolean;
  roundDurationSec: number;
  totalRounds: number;
  gameEndAt: string;
}

interface Props {
  canvasId: number | null;
  onRoundStarted: (payload: RoundStartedPayload) => void;
  onRoundEnded: (payload: RoundEndedPayload) => void;
  onCanvasUpdated: (payload: CanvasUpdatedPayload) => void;
  onVoteUpdate: (payload: VoteUpdatePayload) => void;
  onTimerUpdate: (payload: TimerUpdatePayload) => void;
  onGameEnded: () => void;
}

export default function useSocket({
  canvasId,
  onRoundStarted,
  onRoundEnded,
  onCanvasUpdated,
  onVoteUpdate,
  onTimerUpdate,
  onGameEnded,
}: Props) {
  useEffect(() => {
    if (!canvasId) return;

    socket.connect();
    socket.emit("join:canvas", canvasId);

    socket.on("round:started", onRoundStarted);
    socket.on("round:ended", onRoundEnded);
    socket.on("canvas:updated", onCanvasUpdated);
    socket.on("vote:update", onVoteUpdate);
    socket.on("timer:update", onTimerUpdate);
    socket.on("game:ended", onGameEnded);

    return () => {
      socket.emit("leave:canvas", canvasId);
      socket.off("round:started", onRoundStarted);
      socket.off("round:ended", onRoundEnded);
      socket.off("canvas:updated", onCanvasUpdated);
      socket.off("vote:update", onVoteUpdate);
      socket.off("timer:update", onTimerUpdate);
      socket.off("game:ended", onGameEnded);
      socket.disconnect();
    };
  }, [canvasId]);
}
