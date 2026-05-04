import { useEffect, useRef } from "react";
import socket from "@/shared/lib/socket";
import {
  CanvasBatchUpdatedPayload,
  CanvasJoinedPayload,
  CanvasUpdatedPayload,
  GameSummaryReadyPayload,
  ParticipantsUpdatedPayload,
  RoundEndedPayload,
  RoundStartedPayload,
  RoundSummaryReadyPayload,
  SessionEndedPayload,
  TimerUpdatePayload,
  VoteUpdatePayload,
} from "../model/socket.types";

interface UseGameplaySocketParams {
  canvasId: number | null;
  onCanvasJoined: (payload: CanvasJoinedPayload) => void;
  onRoundStarted: (payload: RoundStartedPayload) => void;
  onRoundEnded: (payload: RoundEndedPayload) => void;
  onRoundSummaryReady: (payload: RoundSummaryReadyPayload) => void;
  onGameSummaryReady: (payload: GameSummaryReadyPayload) => void;
  onCanvasUpdated: (payload: CanvasUpdatedPayload) => void;
  onCanvasBatchUpdated: (payload: CanvasBatchUpdatedPayload) => void;
  onVoteUpdate: (payload: VoteUpdatePayload) => void;
  onTimerUpdate: (payload: TimerUpdatePayload) => void;
  onParticipantsUpdated: (payload: ParticipantsUpdatedPayload) => void;
  onSessionEnded: (payload: SessionEndedPayload) => void;
  onGameEnded: () => void;
}

type GameplaySocketHandlers = Omit<UseGameplaySocketParams, "canvasId">;

export function useGameplaySocket({
  canvasId,
  onCanvasJoined,
  onRoundStarted,
  onRoundEnded,
  onRoundSummaryReady,
  onGameSummaryReady,
  onCanvasUpdated,
  onCanvasBatchUpdated,
  onVoteUpdate,
  onTimerUpdate,
  onParticipantsUpdated,
  onSessionEnded,
  onGameEnded,
}: UseGameplaySocketParams) {
  const handlersRef = useRef<GameplaySocketHandlers>({
    onCanvasJoined,
    onRoundStarted,
    onRoundEnded,
    onRoundSummaryReady,
    onGameSummaryReady,
    onCanvasUpdated,
    onCanvasBatchUpdated,
    onVoteUpdate,
    onTimerUpdate,
    onParticipantsUpdated,
    onSessionEnded,
    onGameEnded,
  });

  useEffect(() => {
    handlersRef.current = {
      onCanvasJoined,
      onRoundStarted,
      onRoundEnded,
      onRoundSummaryReady,
      onGameSummaryReady,
      onCanvasUpdated,
      onCanvasBatchUpdated,
      onVoteUpdate,
      onTimerUpdate,
      onParticipantsUpdated,
      onSessionEnded,
      onGameEnded,
    };
  }, [
    onCanvasJoined,
    onRoundStarted,
    onRoundEnded,
    onRoundSummaryReady,
    onGameSummaryReady,
    onCanvasUpdated,
    onCanvasBatchUpdated,
    onVoteUpdate,
    onTimerUpdate,
    onParticipantsUpdated,
    onSessionEnded,
    onGameEnded,
  ]);

  useEffect(() => {
    const handleCanvasJoined = (payload: CanvasJoinedPayload) => {
      handlersRef.current.onCanvasJoined(payload);
    };
    const handleRoundStarted = (payload: RoundStartedPayload) => {
      handlersRef.current.onRoundStarted(payload);
    };
    const handleRoundEnded = (payload: RoundEndedPayload) => {
      handlersRef.current.onRoundEnded(payload);
    };
    const handleRoundSummaryReady = (payload: RoundSummaryReadyPayload) => {
      handlersRef.current.onRoundSummaryReady(payload);
    };
    const handleGameSummaryReady = (payload: GameSummaryReadyPayload) => {
      handlersRef.current.onGameSummaryReady(payload);
    };
    const handleCanvasUpdated = (payload: CanvasUpdatedPayload) => {
      handlersRef.current.onCanvasUpdated(payload);
    };
    const handleCanvasBatchUpdated = (payload: CanvasBatchUpdatedPayload) => {
      handlersRef.current.onCanvasBatchUpdated(payload);
    };
    const handleVoteUpdate = (payload: VoteUpdatePayload) => {
      handlersRef.current.onVoteUpdate(payload);
    };
    const handleTimerUpdate = (payload: TimerUpdatePayload) => {
      handlersRef.current.onTimerUpdate(payload);
    };
    const handleParticipantsUpdated = (payload: ParticipantsUpdatedPayload) => {
      handlersRef.current.onParticipantsUpdated(payload);
    };
    const handleSessionEnded = (payload: SessionEndedPayload) => {
      handlersRef.current.onSessionEnded(payload);
    };
    const handleGameEnded = () => {
      handlersRef.current.onGameEnded();
    };

    socket.on("canvas:joined", handleCanvasJoined);
    socket.on("round:started", handleRoundStarted);
    socket.on("round:ended", handleRoundEnded);
    socket.on("round-summary:ready", handleRoundSummaryReady);
    socket.on("game-summary:ready", handleGameSummaryReady);
    socket.on("canvas:updated", handleCanvasUpdated);
    socket.on("canvas:batch-updated", handleCanvasBatchUpdated);
    socket.on("vote:update", handleVoteUpdate);
    socket.on("timer:update", handleTimerUpdate);
    socket.on("participants:updated", handleParticipantsUpdated);
    socket.on("auth:session-ended", handleSessionEnded);
    socket.on("session:replaced", handleSessionEnded);
    socket.on("game:ended", handleGameEnded);

    return () => {
      socket.off("canvas:joined", handleCanvasJoined);
      socket.off("round:started", handleRoundStarted);
      socket.off("round:ended", handleRoundEnded);
      socket.off("round-summary:ready", handleRoundSummaryReady);
      socket.off("game-summary:ready", handleGameSummaryReady);
      socket.off("canvas:updated", handleCanvasUpdated);
      socket.off("canvas:batch-updated", handleCanvasBatchUpdated);
      socket.off("vote:update", handleVoteUpdate);
      socket.off("timer:update", handleTimerUpdate);
      socket.off("participants:updated", handleParticipantsUpdated);
      socket.off("auth:session-ended", handleSessionEnded);
      socket.off("session:replaced", handleSessionEnded);
      socket.off("game:ended", handleGameEnded);
    };
  }, []);

  useEffect(() => {
    if (!canvasId) {
      return;
    }

    const joinCanvas = () => {
      socket.emit("join:canvas", canvasId);
    };

    socket.on("connect", joinCanvas);

    if (socket.connected) {
      joinCanvas();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", joinCanvas);
      socket.disconnect();
    };
  }, [canvasId]);
}
