import { useEffect } from "react";
import socket from "@/shared/lib/socket";
import {
  CanvasJoinedPayload,
  CanvasUpdatedPayload,
  ParticipantsUpdatedPayload,
  RoundEndedPayload,
  RoundStartedPayload,
  TimerUpdatePayload,
  VoteUpdatePayload,
} from "../model/socket.types";

interface UseGameplaySocketParams {
  canvasId: number | null;
  onCanvasJoined: (payload: CanvasJoinedPayload) => void;
  onRoundStarted: (payload: RoundStartedPayload) => void;
  onRoundEnded: (payload: RoundEndedPayload) => void;
  onCanvasUpdated: (payload: CanvasUpdatedPayload) => void;
  onVoteUpdate: (payload: VoteUpdatePayload) => void;
  onTimerUpdate: (payload: TimerUpdatePayload) => void;
  onParticipantsUpdated: (payload: ParticipantsUpdatedPayload) => void;
  onGameEnded: () => void;
}

export function useGameplaySocket({
  canvasId,
  onCanvasJoined,
  onRoundStarted,
  onRoundEnded,
  onCanvasUpdated,
  onVoteUpdate,
  onTimerUpdate,
  onParticipantsUpdated,
  onGameEnded,
}: UseGameplaySocketParams) {
  useEffect(() => {
    if (!canvasId) return;

    socket.on("canvas:joined", onCanvasJoined);
    socket.on("round:started", onRoundStarted);
    socket.on("round:ended", onRoundEnded);
    socket.on("canvas:updated", onCanvasUpdated);
    socket.on("vote:update", onVoteUpdate);
    socket.on("timer:update", onTimerUpdate);
    socket.on("participants:updated", onParticipantsUpdated);
    socket.on("game:ended", onGameEnded);

    socket.connect();
    socket.emit("join:canvas", canvasId);

    return () => {
      socket.emit("leave:canvas", canvasId);
      socket.off("canvas:joined", onCanvasJoined);
      socket.off("round:started", onRoundStarted);
      socket.off("round:ended", onRoundEnded);
      socket.off("canvas:updated", onCanvasUpdated);
      socket.off("vote:update", onVoteUpdate);
      socket.off("timer:update", onTimerUpdate);
      socket.off("participants:updated", onParticipantsUpdated);
      socket.off("game:ended", onGameEnded);
      socket.disconnect();
    };
  }, [
    canvasId,
    onCanvasJoined,
    onCanvasUpdated,
    onGameEnded,
    onParticipantsUpdated,
    onRoundEnded,
    onRoundStarted,
    onTimerUpdate,
    onVoteUpdate,
  ]);
}
