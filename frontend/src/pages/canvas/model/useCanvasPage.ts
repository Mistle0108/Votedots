import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  resolvePlayBackgroundImageUrl,
  type PlayBackgroundMode,
} from "@/features/gameplay/canvas/model/background-assets";
import { useChunkLoader } from "@/features/gameplay/canvas/hooks/useChunkLoader";
import { useCanvasHistory } from "@/features/gameplay/history/hooks/useCanvasHistory";
import { useVotePopup, useVoteState } from "@/features/gameplay/vote";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type { SessionBootstrapResult } from "@/features/gameplay/session";
import type { CanvasBatchUpdatedPayload } from "@/features/gameplay/session/model/socket.types";
import useCanvasGameplay from "./useCanvasGameplay";
import useCanvasScene from "./useCanvasScene";
import { getCanvasTopCenterModalPosition } from "./modal-position";

interface UseCanvasPageParams {
  onSessionEnded: () => void;
  onUnauthorized: (message: string) => void;
}

const PLAY_BACKGROUND_MODE_STORAGE_KEY = "votedots:play-background-mode";

function getDefaultRoundSummaryModalPosition() {
  return getCanvasTopCenterModalPosition(700);
}

export default function useCanvasPage({
  onSessionEnded,
  onUnauthorized,
}: UseCanvasPageParams) {
  const isRoundExpiredRef = useRef(false);
  const lastAutoOpenedRoundIdRef = useRef<number | null>(null);

  const [roundSummaryModal, setRoundSummaryModal] =
    useState<RoundSummaryData | null>(null);
  const [gameSummaryModal, setGameSummaryModal] =
    useState<GameSummaryData | null>(null);
  const [introGuideOpen, setIntroGuideOpen] = useState(false);
  const [roundSummaryOpen, setRoundSummaryOpen] = useState(false);
  const [roundSummaryPosition, setRoundSummaryPosition] = useState(
    getDefaultRoundSummaryModalPosition,
  );
  const [backgroundMode, setBackgroundMode] = useState<PlayBackgroundMode>(() => {
    if (typeof window === "undefined") {
      return "w";
    }

    const stored = window.localStorage.getItem(PLAY_BACKGROUND_MODE_STORAGE_KEY);
    return stored === "g" || stored === "b" ? stored : "w";
  });

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
    minimapCells,
    canvasId,
    gridX,
    gridY,
    selectedCell,
    displaySelectedCell,
    viewport,
    surfaceSize,
    cameraX,
    cameraY,
    zoom,
    worldOffset,
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
    isDraggingCanvas,
    handleWheel,
    handleCanvasUpdated,
    handleCanvasBatchUpdated,
    clearSelectedCell,
    applySelectedCellColor,
    hideSelectedCellVisual,
  } = useCanvasScene({
    previewColor,
    votingCellIds,
    topColorMap,
    resetPreviewColor,
    openPopup,
  });

  const [resultTemplateImageUrl, setResultTemplateImageUrl] = useState<
    string | null
  >(null);
  const playBackgroundImageUrl = useMemo(
    () =>
      resolvePlayBackgroundImageUrl({
        gridX,
        gridY,
        backgroundMode,
      }),
    [backgroundMode, gridX, gridY],
  );

  const applyBootstrapScene = useCallback(
    (result: SessionBootstrapResult) => {
      setCanvasId(result.canvasId);
      setGridX(result.gridX);
      setGridY(result.gridY);
      setResultTemplateImageUrl(result.resultTemplateImageUrl);
    },
    [setCanvasId, setGridX, setGridY],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PLAY_BACKGROUND_MODE_STORAGE_KEY,
      backgroundMode,
    );
  }, [backgroundMode]);

  const { invalidateChunksByCells } = useChunkLoader({
    canvasId,
    gridX,
    gridY,
    viewport,
    updateCells,
  });

  const handleCanvasBatchUpdatedForRoundResult = useCallback(
    (payload: CanvasBatchUpdatedPayload) => {
      invalidateChunksByCells(payload.updates);
      handleCanvasBatchUpdated(payload);
    },
    [handleCanvasBatchUpdated, invalidateChunksByCells],
  );

  const handleRoundEndedCleanup = useCallback(() => {
    clearSelectedCell();
    resetPreviewColor();
    closePopup();
  }, [clearSelectedCell, resetPreviewColor, closePopup]);

  const handleRoundStartedCleanup = useCallback(() => {
    setRoundSummaryOpen(false);
    setRoundSummaryModal(null);
    setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
  }, []);

  const handleGameEndedCleanup = useCallback(() => {
    clearSelectedCell();
  }, [clearSelectedCell]);

  const {
    historyItems,
    historyLoading,
    historyError,
    addRoundHistoryItem,
    addGameHistoryItem,
  } = useCanvasHistory(canvasId);

  const openRoundSummaryModalNow = useCallback((summary: RoundSummaryData) => {
    setIntroGuideOpen(false);
    setGameSummaryModal(null);
    setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
    setRoundSummaryModal(summary);
    setRoundSummaryOpen(true);
  }, []);

  const openGameSummaryModalNow = useCallback((summary: GameSummaryData) => {
    setIntroGuideOpen(false);
    setRoundSummaryOpen(false);
    setRoundSummaryModal(null);
    setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
    setGameSummaryModal(summary);
  }, []);

  const handleOpenRoundSummaryModal = useCallback((summary: RoundSummaryData) => {
    openRoundSummaryModalNow(summary);
  }, [openRoundSummaryModalNow]);

  const handleOpenGameSummaryModal = useCallback((summary: GameSummaryData) => {
    openGameSummaryModalNow(summary);
  }, [openGameSummaryModalNow]);

  const handleCloseRoundSummaryModal = useCallback(() => {
    setRoundSummaryOpen(false);
    setRoundSummaryModal(null);
    setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
  }, []);

  const handleReceiveRoundSummary = useCallback(
    (summary: RoundSummaryData) => {
      addRoundHistoryItem(summary);

      if (introGuideOpen) {
        lastAutoOpenedRoundIdRef.current = summary.roundId;
        return;
      }

      if (lastAutoOpenedRoundIdRef.current === summary.roundId) {
        setRoundSummaryModal(summary);
        return;
      }

      lastAutoOpenedRoundIdRef.current = summary.roundId;
      openRoundSummaryModalNow(summary);
    },
    [addRoundHistoryItem, introGuideOpen, openRoundSummaryModalNow],
  );

  const handleReceiveGameSummary = useCallback(
    (summary: GameSummaryData) => {
      addGameHistoryItem(summary);

      if (introGuideOpen) {
        return;
      }

      openGameSummaryModalNow(summary);
    },
    [addGameHistoryItem, introGuideOpen, openGameSummaryModalNow],
  );

  const handleCloseGameSummaryModal = useCallback(() => {
    setGameSummaryModal(null);
  }, []);

  const handleOpenIntroGuide = useCallback(() => {
    setRoundSummaryOpen(false);
    setRoundSummaryModal(null);
    setGameSummaryModal(null);
    setRoundSummaryPosition(getDefaultRoundSummaryModalPosition());
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
    onCanvasBatchUpdated: handleCanvasBatchUpdatedForRoundResult,
    onOpenRoundSummaryModal: handleReceiveRoundSummary,
    onOpenGameSummaryModal: handleReceiveGameSummary,
    onRoundStartedCleanup: handleRoundStartedCleanup,
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

  const handleVoteSuccess = useCallback((color: string) => {
    applySelectedCellColor(color);
    hideSelectedCellVisual();
    gameplay.handleVoteSuccess();
  }, [applySelectedCellColor, gameplay, hideSelectedCellVisual]);

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
    isDraggingCanvas,
    handleWheel,
    popupOpen,
    popupPos,
    canvasId,
    phase: gameplay.phase,
    roundId: gameplay.roundId,
    isRoundExpired: gameplay.isRoundExpired,
    selectedCell,
    displaySelectedCell,
    votes,
    cells,
    minimapCells,
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
    handleOpenRoundSummaryModal,
    handleOpenGameSummaryModal,
    gridX,
    gridY,
    playBackgroundImageUrl,
    resultTemplateImageUrl,
    viewport,
    surfaceSize,
    cameraX,
    cameraY,
    zoom,
    worldOffset,
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
    backgroundMode,
    setBackgroundMode,
    historyItems,
    historyLoading,
    historyError,
  };
}
