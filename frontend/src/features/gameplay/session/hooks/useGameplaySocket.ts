import { useEffect } from "react";
import socket from "@/shared/lib/socket";
import {
  CanvasUpdatedPayload,
  RoundEndedPayload,
  RoundStartedPayload,
  TimerUpdatePayload,
  VoteUpdatePayload,
} from "../model/socket.types";

interface UseGameplaySocketParams {
  canvasId: number | null;
  onRoundStarted: (payload: RoundStartedPayload) => void;
  onRoundEnded: (payload: RoundEndedPayload) => void;
  onCanvasUpdated: (payload: CanvasUpdatedPayload) => void;
  onVoteUpdate: (payload: VoteUpdatePayload) => void;
  onTimerUpdate: (payload: TimerUpdatePayload) => void;
  onGameEnded: () => void;
}

export function useGameplaySocket({
  canvasId,
  onRoundStarted,
  onRoundEnded,
  onCanvasUpdated,
  onVoteUpdate,
  onTimerUpdate,
  onGameEnded,
}: UseGameplaySocketParams) {
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
  }, [
    canvasId,
    onCanvasUpdated,
    onGameEnded,
    onRoundEnded,
    onRoundStarted,
    onTimerUpdate,
    onVoteUpdate,
  ]);
}
