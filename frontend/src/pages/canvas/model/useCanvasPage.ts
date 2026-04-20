// TO-BE
import { useCallback, useEffect, useRef, useState } from "react";
import { useChunkLoader } from "@/features/gameplay/canvas/hooks/useChunkLoader";
import { useVotePopup, useVoteState } from "@/features/gameplay/vote";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type { SessionBootstrapResult } from "@/features/gameplay/session";
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

function isRoundSummaryPhase(phase: GamePhase) {
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
    previewColor,
    openPopup,
    closePopup,
    resetPreviewColor,
    handleColorChange,
  } = useVotePopup();

  const { votes, votingCellIds, topColorMap, applyVoteUpdate, resetVoteState } =
    useVoteState();

  const {
    paintCanvasRef,
    canvasRef,
    containerRef,
    cells,
    canvasId,
    gridX,
    gridY,
    selectedCell,
    viewport,
    cameraX,
    cameraY,
    zoom,
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
    handleCanvasBatchUpdated,
    clearSelectedCell,
  } = useCanvasScene({
    previewColor,
    votingCellIds,
    topColorMap,
    resetPreviewColor,
    openPopup,
  });

  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    null,
  );

  const applyBootstrapScene = useCallback(
    (result: SessionBootstrapResult) => {
      setCanvasId(result.canvasId);
      setGridX(result.gridX);
      setGridY(result.gridY);
      setBackgroundImageUrl(result.backgroundImageUrl);
      updateCells(result.cells);
    },
    [setCanvasId, setGridX, setGridY, updateCells],
  );

  useChunkLoader({
    canvasId,
    gridX,
    gridY,
    viewport,
    updateCells,
  });

  const handleRoundEndedCleanup = useCallback(() => {
    clearSelectedCell();
    resetPreviewColor();
    closePopup();
  }, [clearSelectedCell, resetPreviewColor, closePopup]);

  const handleGameEndedCleanup = useCallback(() => {
    clearSelectedCell();
  }, [clearSelectedCell]);

  const handleOpenRoundSummaryModal = useCallback(
    (summary: RoundSummaryData) => {
      setRoundSummaryModal(summary);

      if (!roundSummaryOpen) {
        setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
      }

      setRoundSummaryOpen(true);
    },
    [roundSummaryOpen],
  );

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
    onBootstrapScene: applyBootstrapScene,
    onCanvasUpdated: handleCanvasUpdated,
    onCanvasBatchUpdated: handleCanvasBatchUpdated,
    onOpenRoundSummaryModal: handleOpenRoundSummaryModal,
    onOpenGameSummaryModal: handleOpenGameSummaryModal,
    onRoundEndedCleanup: handleRoundEndedCleanup,
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
    if (!isRoundSummaryPhase(gameplay.phase)) {
      handleCloseRoundSummaryModal();
    }
  }, [gameplay.phase, handleCloseRoundSummaryModal]);

  const handleOpenLatestRoundSummary = useCallback(() => {
    if (!gameplay.roundSummary || !gameplay.canOpenLatestRoundSummary) {
      return;
    }

    handleOpenRoundSummaryModal(gameplay.roundSummary);
  }, [
    gameplay.canOpenLatestRoundSummary,
    gameplay.roundSummary,
    handleOpenRoundSummaryModal,
  ]);

  const handlePopupClose = useCallback(() => {
    closePopup();
  }, [closePopup]);

  const handleVoteSuccess = useCallback(() => {
    clearSelectedCell();
    gameplay.handleVoteSuccess();
  }, [clearSelectedCell, gameplay]);

  return {
    paintCanvasRef,
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
    handleVoteSuccess,
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
    backgroundImageUrl,
    viewport,
    cameraX,
    cameraY,
    zoom,
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
    latestRoundSnapshot: gameplay.latestRoundSnapshot,
    isLatestRoundSummaryEnabled: gameplay.canOpenLatestRoundSummary,
  };
}
