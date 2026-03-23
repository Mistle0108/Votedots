import { useEffect } from "react";
import socket from "@/lib/socket";

interface RoundStartedPayload {
  roundId: number;
  roundNumber: number;
  startedAt: string;
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

interface Props {
  canvasId: number | null;
  onRoundStarted: (payload: RoundStartedPayload) => void;
  onRoundEnded: (payload: RoundEndedPayload) => void;
  onCanvasUpdated: (payload: CanvasUpdatedPayload) => void;
  onVoteUpdate: (payload: VoteUpdatePayload) => void;
  onGameEnded: () => void;
}

export default function useSocket({
  canvasId,
  onRoundStarted,
  onRoundEnded,
  onCanvasUpdated,
  onVoteUpdate,
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
    socket.on("game:ended", onGameEnded);

    return () => {
      socket.emit("leave:canvas", canvasId);
      socket.off("round:started", onRoundStarted);
      socket.off("round:ended", onRoundEnded);
      socket.off("canvas:updated", onCanvasUpdated);
      socket.off("vote:update", onVoteUpdate);
      socket.off("game:ended", onGameEnded);
      socket.disconnect();
    };
  }, [canvasId]);
}
