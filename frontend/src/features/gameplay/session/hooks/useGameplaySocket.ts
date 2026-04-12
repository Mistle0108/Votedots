import { useEffect } from "react";
import socket from "@/shared/lib/socket";
import {
  CanvasBatchUpdatedPayload, // 추가: batch canvas update payload 타입
  CanvasJoinedPayload,
  CanvasUpdatedPayload,
  ParticipantsUpdatedPayload,
  RoundEndedPayload,
  RoundStartedPayload,
  SessionEndedPayload,
  TimerUpdatePayload,
  VoteUpdatePayload,
} from "../model/socket.types";

interface UseGameplaySocketParams {
  canvasId: number | null;
  onCanvasJoined: (payload: CanvasJoinedPayload) => void;
  onRoundStarted: (payload: RoundStartedPayload) => void;
  onRoundEnded: (payload: RoundEndedPayload) => void;
  onCanvasUpdated: (payload: CanvasUpdatedPayload) => void;
  onCanvasBatchUpdated: (payload: CanvasBatchUpdatedPayload) => void; // 추가: batch update 핸들러
  onVoteUpdate: (payload: VoteUpdatePayload) => void;
  onTimerUpdate: (payload: TimerUpdatePayload) => void;
  onParticipantsUpdated: (payload: ParticipantsUpdatedPayload) => void;
  onSessionEnded: (payload: SessionEndedPayload) => void;
  onGameEnded: () => void;
}

export function useGameplaySocket({
  canvasId,
  onCanvasJoined,
  onRoundStarted,
  onRoundEnded,
  onCanvasUpdated,
  onCanvasBatchUpdated, // 추가: batch update 핸들러 주입
  onVoteUpdate,
  onTimerUpdate,
  onParticipantsUpdated,
  onSessionEnded,
  onGameEnded,
}: UseGameplaySocketParams) {
  useEffect(() => {
    socket.on("canvas:joined", onCanvasJoined);
    socket.on("round:started", onRoundStarted);
    socket.on("round:ended", onRoundEnded);
    socket.on("canvas:updated", onCanvasUpdated);
    socket.on("canvas:batch-updated", onCanvasBatchUpdated); // 추가: batch update 이벤트 구독
    socket.on("vote:update", onVoteUpdate);
    socket.on("timer:update", onTimerUpdate);
    socket.on("participants:updated", onParticipantsUpdated);
    socket.on("auth:session-ended", onSessionEnded);
    socket.on("session:replaced", onSessionEnded);
    socket.on("game:ended", onGameEnded);

    if (canvasId) {
      socket.connect();
      socket.emit("join:canvas", canvasId);
    }

    return () => {
      socket.off("canvas:joined", onCanvasJoined);
      socket.off("round:started", onRoundStarted);
      socket.off("round:ended", onRoundEnded);
      socket.off("canvas:updated", onCanvasUpdated);
      socket.off("canvas:batch-updated", onCanvasBatchUpdated); // 추가: batch update 이벤트 해제
      socket.off("vote:update", onVoteUpdate);
      socket.off("timer:update", onTimerUpdate);
      socket.off("participants:updated", onParticipantsUpdated);
      socket.off("auth:session-ended", onSessionEnded);
      socket.off("session:replaced", onSessionEnded);
      socket.off("game:ended", onGameEnded);
      socket.disconnect();
    };
  }, [
    canvasId,
    onCanvasBatchUpdated, // 추가: effect dependency
    onCanvasJoined,
    onCanvasUpdated,
    onGameEnded,
    onParticipantsUpdated,
    onRoundEnded,
    onRoundStarted,
    onSessionEnded,
    onTimerUpdate,
    onVoteUpdate,
  ]);
}
