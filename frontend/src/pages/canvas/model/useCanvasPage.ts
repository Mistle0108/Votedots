import { useCallback, useEffect, useRef, useState } from "react";
import { useVotePopup, useVoteState } from "@/features/gameplay/vote";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type { SessionBootstrapResult } from "@/features/gameplay/session";
import useCanvasGameplay from "./useCanvasGameplay";
import useCanvasScene from "./useCanvasScene";

interface UseCanvasPageParams {
  onSessionEnded: () => void;
  onUnauthorized: (message: string) => void;
}

export default function useCanvasPage({
  onSessionEnded,
  onUnauthorized,
}: UseCanvasPageParams) {
  const isRoundExpiredRef = useRef(false);

  const [roundSummaryModal, setRoundSummaryModal] =
    useState<RoundSummaryData | null>(null);
  const [gameSummaryModal, setGameSummaryModal] =
    useState<GameSummaryData | null>(null);

  const {
    popupOpen,
    popupPos,
    previewColorRef,
    openPopup,
    closePopup,
    resetPreviewColor,
    handleColorChange,
  } = useVotePopup();

  const {
    votes,
    votingCellIdsRef,
    topColorMapRef,
    applyVoteUpdate,
    resetVoteState,
  } = useVoteState();

  const {
    canvasRef,
    containerRef,
    cells,
    canvasId,
    gridX,
    gridY,
    selectedCell,
    viewport,
    navigateToCoordinate,
    resetCanvasZoom,
    setCanvasId,
    setGridX,
    setGridY,
    updateCells,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    handleCanvasUpdated,
    handleCanvasBatchUpdated, // 추가: batch canvas update handler
    clearSelectedCell,
  } = useCanvasScene({
    previewColorRef,
    votingCellIdsRef,
    topColorMapRef,
    isRoundExpiredRef,
    resetPreviewColor,
    openPopup,
    closePopup,
  });

  const applyBootstrapScene = useCallback(
    (result: SessionBootstrapResult) => {
      setCanvasId(result.canvasId);
      setGridX(result.gridX);
      setGridY(result.gridY);
      updateCells(result.cells);
    },
    [setCanvasId, setGridX, setGridY, updateCells],
  );

  const handleGameEndedCleanup = useCallback(() => {
    clearSelectedCell();
  }, [clearSelectedCell]);

  const handleOpenRoundSummaryModal = useCallback(
    (summary: RoundSummaryData) => {
      setRoundSummaryModal(summary);
    },
    [],
  );

  const handleOpenGameSummaryModal = useCallback((summary: GameSummaryData) => {
    setGameSummaryModal(summary);
  }, []);

  const handleCloseRoundSummaryModal = useCallback(() => {
    setRoundSummaryModal(null);
  }, []);

  const handleCloseGameSummaryModal = useCallback(() => {
    setGameSummaryModal(null);
  }, []);

  const gameplay = useCanvasGameplay({
    canvasId,
    onBootstrapScene: applyBootstrapScene,
    onCanvasUpdated: handleCanvasUpdated,
    onCanvasBatchUpdated: handleCanvasBatchUpdated,
    onOpenRoundSummaryModal: handleOpenRoundSummaryModal,
    onOpenGameSummaryModal: handleOpenGameSummaryModal,
    onGameEndedCleanup: handleGameEndedCleanup,
    onSessionEnded,
    onUnauthorized,
    applyVoteUpdate,
    resetVoteState,
  });

  useEffect(() => {
    isRoundExpiredRef.current = gameplay.isRoundExpiredRefValue;
  }, [gameplay.isRoundExpiredRefValue]);

  const handlePopupClose = useCallback(() => {
    clearSelectedCell();
    closePopup();
  }, [clearSelectedCell, closePopup]);

  return {
    canvasRef,
    containerRef,
    loading: gameplay.loading,
    error: gameplay.error,
    gameEnded: gameplay.gameEnded,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    popupOpen,
    popupPos,
    canvasId,
    phase: gameplay.phase,
    roundId: gameplay.roundId,
    isRoundExpired: gameplay.isRoundExpired,
    selectedCell,
    votes,
    cells,
    handleVoteSuccess: gameplay.handleVoteSuccess,
    handleColorChange,
    handlePopupClose,
    roundNumber: gameplay.roundNumber,
    totalRounds: gameplay.totalRounds,
    formattedGameEndTime: gameplay.formattedGameEndTime,
    formattedRemainingTime: gameplay.formattedRemainingTime,
    remainingSeconds: gameplay.remainingSeconds,
    roundDurationSec: gameplay.roundDurationSec,
    remaining: gameplay.remaining,
    participantCount: gameplay.participantCount,
    votingParticipantCount: gameplay.votingParticipantCount,
    participants: gameplay.participants,
    participantLoading: gameplay.participantLoading,
    participantError: gameplay.participantError,
    gameConfig: gameplay.gameConfig,
    roundSummaryModal,
    gameSummaryModal,
    handleCloseRoundSummaryModal,
    handleCloseGameSummaryModal,
    gridX,
    gridY,
    viewport,
    navigateToCoordinate,
    resetCanvasZoom,
  };
}
