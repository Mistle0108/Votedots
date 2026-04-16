import { useCallback, useEffect, useRef, useState } from "react";
import { useVotePopup, useVoteState } from "@/features/gameplay/vote";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type { SessionBootstrapResult } from "@/features/gameplay/session";
import { getLatestRoundSnapshot } from "@/features/gameplay/round/model/roundSnapshot.storage";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import useCanvasGameplay from "./useCanvasGameplay";
import useCanvasScene from "./useCanvasScene";

interface UseCanvasPageParams {
  onSessionEnded: () => void;
  onUnauthorized: (message: string) => void;
}

function getDefaultRoundSummaryModalPosition() {
  const modalWidth = Math.min(560, window.innerWidth - 24);
  const modalHeight = Math.min(window.innerHeight - 48, 720);

  return {
    x: Math.max(12, Math.round((window.innerWidth - modalWidth) / 2)),
    y: Math.max(24, Math.round((window.innerHeight - modalHeight) / 2)),
  };
}

function isRoundSummaryEnabled(phase: GamePhase) {
  return (
    phase === GAME_PHASE.ROUND_RESULT || phase === GAME_PHASE.ROUND_START_WAIT
  );
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
  const [introGuideOpen, setIntroGuideOpen] = useState(false);
  const [roundSummaryOpen, setRoundSummaryOpen] = useState(false);
  const [roundSummaryPosition, setRoundSummaryPosition] = useState(
    getDefaultRoundSummaryModalPosition,
  );

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

  const handleOpenRoundSummaryModal = useCallback((summary: RoundSummaryData) => {
    setRoundSummaryModal(summary);
    setRoundSummaryOpen(true);
    setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
  }, []);

  const handleOpenGameSummaryModal = useCallback((summary: GameSummaryData) => {
    setGameSummaryModal(summary);
  }, []);

  const handleCloseRoundSummaryModal = useCallback(() => {
    setRoundSummaryOpen(false);
    setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
  }, []);

  const handleCloseGameSummaryModal = useCallback(() => {
    setGameSummaryModal(null);
  }, []);

  const handleOpenIntroGuide = useCallback(() => {
    setIntroGuideOpen(true);
  }, []);

  const handleCloseIntroGuide = useCallback(() => {
    setIntroGuideOpen(false);
  }, []);

  const handleRoundSummaryDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();

      const dragOffsetX = event.clientX - roundSummaryPosition.x;
      const dragOffsetY = event.clientY - roundSummaryPosition.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        setRoundSummaryPosition({
          x: moveEvent.clientX - dragOffsetX,
          y: moveEvent.clientY - dragOffsetY,
        });
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [roundSummaryPosition.x, roundSummaryPosition.y],
  );

  const gameplay = useCanvasGameplay({
    canvasId,
    canvasElementRef: canvasRef,
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

  useEffect(() => {
    if (!isRoundSummaryEnabled(gameplay.phase)) {
      handleCloseRoundSummaryModal();
    }
  }, [gameplay.phase, handleCloseRoundSummaryModal]);

  const handleOpenLatestRoundSummary = useCallback(() => {
    if (!gameplay.roundSummary || !isRoundSummaryEnabled(gameplay.phase)) {
      return;
    }

    handleOpenRoundSummaryModal(gameplay.roundSummary);
  }, [gameplay.phase, gameplay.roundSummary, handleOpenRoundSummaryModal]);

  const handlePopupClose = useCallback(() => {
    clearSelectedCell();
    closePopup();
  }, [clearSelectedCell, closePopup]);

  const latestStoredRoundSnapshot = getLatestRoundSnapshot();

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
    introGuideOpen,
    handleOpenIntroGuide,
    handleCloseIntroGuide,
    roundSummaryOpen,
    roundSummaryPosition,
    handleRoundSummaryDragStart,
    handleOpenLatestRoundSummary,
    latestRoundSummary: gameplay.roundSummary,
    latestRoundSnapshot:
      gameplay.latestRoundSnapshot ?? latestStoredRoundSnapshot.snapshot,
    isLatestRoundSummaryEnabled: isRoundSummaryEnabled(gameplay.phase),
  };
}
