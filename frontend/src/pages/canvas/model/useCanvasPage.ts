import { useCallback, useEffect, useRef } from "react";
import { useVotePopup, useVoteState } from "@/features/gameplay/vote";
import type { SessionBootstrapResult } from "@/features/gameplay/session";
import useCanvasGameplay from "./useCanvasGameplay";
import useCanvasScene from "./useCanvasScene";

interface UseCanvasPageParams {
  onSessionEnded: () => void;
}

export default function useCanvasPage({ onSessionEnded }: UseCanvasPageParams) {
  const isRoundExpiredRef = useRef(false);

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
    setCanvasId,
    setGridX,
    setGridY,
    updateCells,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleCanvasUpdated,
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

  const gameplay = useCanvasGameplay({
    canvasId,
    onBootstrapScene: applyBootstrapScene,
    onCanvasUpdated: handleCanvasUpdated,
    onGameEndedCleanup: handleGameEndedCleanup,
    onSessionEnded,
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
    popupOpen,
    popupPos,
    canvasId,
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
    participants: gameplay.participants,
    participantLoading: gameplay.participantLoading,
    participantError: gameplay.participantError,
    gridX,
    gridY,
    viewport,
    navigateToCoordinate,
  };
}
