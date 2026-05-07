import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth";
import {
  CanvasStage,
  CanvasSurface,
  PANEL_WIDTH,
} from "@/features/gameplay/canvas";
import { GameHistoryPanel } from "@/features/gameplay/history";
import { IntroGuideModal } from "@/features/gameplay/intro";
import RoundSummaryModal from "@/features/gameplay/round/components/RoundSummaryModal";
import { GAME_PHASE } from "@/features/gameplay/session/model/game-phase.types";
import GameSummaryModal from "@/features/gameplay/session/components/GameSummaryModal";
import {
  ErrorScreen,
  GameEndedScreen,
  LoadingScreen,
} from "@/features/gameplay/session";
import { VotePanel, VotePopup } from "@/features/gameplay/vote";
import { useI18n } from "@/shared/i18n";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import useCanvasPage from "./model/useCanvasPage";
import { PLAY_THEME_STYLE } from "./model/play-theme";

const INTRO_GUIDE_SEEN_STORAGE_KEY = "votedots:intro-guide-seen";
const ROUND_SELECTION_GUIDE_DURATION_MS = 2500;
const SELECTION_PULSE_DURATION_MS = 1000;

interface SelectionGuideState {
  roundSelectionGuideVisible: boolean;
  pulsingSelectionCellKeys: Set<string>;
}

type SelectionGuideAction =
  | { type: "reset" }
  | { type: "announceRound" }
  | { type: "hideGuide" }
  | { type: "setPulsing"; cellKeys: string[] }
  | { type: "clearPulsing" };

const INITIAL_SELECTION_GUIDE_STATE: SelectionGuideState = {
  roundSelectionGuideVisible: false,
  pulsingSelectionCellKeys: new Set(),
};

function selectionGuideReducer(
  state: SelectionGuideState,
  action: SelectionGuideAction,
): SelectionGuideState {
  switch (action.type) {
    case "reset":
      return INITIAL_SELECTION_GUIDE_STATE;
    case "announceRound":
      return {
        roundSelectionGuideVisible: true,
        pulsingSelectionCellKeys: new Set(),
      };
    case "hideGuide":
      return {
        ...state,
        roundSelectionGuideVisible: false,
      };
    case "setPulsing":
      return {
        ...state,
        pulsingSelectionCellKeys: new Set(action.cellKeys),
      };
    case "clearPulsing":
      return {
        ...state,
        pulsingSelectionCellKeys: new Set(),
      };
  }
}

function buildIntroGuideSeenStorageKey(canvasId: number): string {
  return `${INTRO_GUIDE_SEEN_STORAGE_KEY}:${canvasId}`;
}

export default function CanvasPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  usePageRootClass("page-shell-root");
  const [currentVoterUuid, setCurrentVoterUuid] = useState<string | null>(null);
  const [selectionGuideState, dispatchSelectionGuide] = useReducer(
    selectionGuideReducer,
    INITIAL_SELECTION_GUIDE_STATE,
  );
  const guideTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const lastAnnouncedRoundIdRef = useRef<number | null>(null);
  const hasPulsedSelectionThisRoundRef = useRef(false);

  const handleSessionEnded = useCallback(() => {
    window.alert(t("canvas.sessionEnded"));
    navigate("/login", { replace: true });
  }, [navigate, t]);

  const handleUnauthorized = useCallback(
    (message: string) => {
      window.alert(message);
      navigate("/login", { replace: true });
    },
    [navigate],
  );

  const {
    paintCanvasRef,
    canvasRef,
    containerRef,
    loading,
    error,
    gameEnded,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    isDraggingCanvas,
    handleWheel,
    popupOpen,
    popupPos,
    canvasId,
    phase,
    roundId,
    isRoundExpired,
    selectedCell,
    displaySelectedCell,
    votes,
    cells,
    handleVoteSuccess,
    handleColorChange,
    handlePopupClose,
    roundNumber,
    totalRounds,
    formattedGameEndTime,
    formattedRemainingTime,
    remainingSeconds,
    roundDurationSec,
    remaining,
    votingParticipantCount,
    participants,
    participantLoading,
    participantError,
    gameConfig,
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
    latestRoundSnapshot,
    backgroundMode,
    setBackgroundMode,
    historyItems,
    historyLoading,
    historyError,
  } = useCanvasPage({
    onSessionEnded: handleSessionEnded,
    onUnauthorized: handleUnauthorized,
  });

  const canvasPageThemeStyle = PLAY_THEME_STYLE;
  const selectionLabels = useMemo(() => {
    if (!currentVoterUuid) {
      return [];
    }

    const stackCountByCell = new Map<string, number>();

    return participants
      .filter(
        (participant) =>
          participant.selectedCell && participant.voterUuid !== currentVoterUuid,
      )
      .map((participant) => {
        const selectedCell = participant.selectedCell!;
        const cellKey = `${selectedCell.x}:${selectedCell.y}`;
        const stackIndex = stackCountByCell.get(cellKey) ?? 0;

        stackCountByCell.set(cellKey, stackIndex + 1);

        return {
          key: `${participant.sessionId}:${cellKey}`,
          nickname: participant.nickname,
          x: selectedCell.x,
          y: selectedCell.y,
          stackIndex,
        };
      });
  }, [currentVoterUuid, participants]);
  const uniqueSelectionCellKeys = useMemo(
    () =>
      Array.from(
        new Set(selectionLabels.map((label) => `${label.x}:${label.y}`)),
      ),
    [selectionLabels],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchCurrentVoter = async () => {
      try {
        const { data } = await authApi.me();

        if (cancelled) {
          return;
        }

        setCurrentVoterUuid(data.voter.uuid);
      } catch {
        if (!cancelled) {
          setCurrentVoterUuid(null);
        }
      }
    };

    void fetchCurrentVoter();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (guideTimerRef.current !== null) {
        window.clearTimeout(guideTimerRef.current);
      }

      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== GAME_PHASE.ROUND_ACTIVE || roundId === null) {
      dispatchSelectionGuide({ type: "reset" });
      hasPulsedSelectionThisRoundRef.current = false;

      if (guideTimerRef.current !== null) {
        window.clearTimeout(guideTimerRef.current);
        guideTimerRef.current = null;
      }

      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }

      return;
    }

    if (lastAnnouncedRoundIdRef.current === roundId) {
      return;
    }

    lastAnnouncedRoundIdRef.current = roundId;
    hasPulsedSelectionThisRoundRef.current = false;
    dispatchSelectionGuide({ type: "announceRound" });

    if (guideTimerRef.current !== null) {
      window.clearTimeout(guideTimerRef.current);
    }

    guideTimerRef.current = window.setTimeout(() => {
      guideTimerRef.current = null;
      dispatchSelectionGuide({ type: "hideGuide" });
    }, ROUND_SELECTION_GUIDE_DURATION_MS);
  }, [phase, roundId]);

  useEffect(() => {
    if (phase !== GAME_PHASE.ROUND_ACTIVE || hasPulsedSelectionThisRoundRef.current) {
      return;
    }

    if (uniqueSelectionCellKeys.length === 0) {
      return;
    }

    hasPulsedSelectionThisRoundRef.current = true;
    dispatchSelectionGuide({
      type: "setPulsing",
      cellKeys: uniqueSelectionCellKeys,
    });

    if (pulseTimerRef.current !== null) {
      window.clearTimeout(pulseTimerRef.current);
    }

    pulseTimerRef.current = window.setTimeout(() => {
      pulseTimerRef.current = null;
      dispatchSelectionGuide({ type: "clearPulsing" });
    }, SELECTION_PULSE_DURATION_MS);
  }, [phase, uniqueSelectionCellKeys]);

  useEffect(() => {
    if (!canvasId || loading || error || gameEnded) {
      return;
    }

    const storageKey = buildIntroGuideSeenStorageKey(canvasId);

    if (window.sessionStorage.getItem(storageKey) === "true") {
      return;
    }

    window.sessionStorage.setItem(storageKey, "true");
    handleOpenIntroGuide();
  }, [canvasId, error, gameEnded, handleOpenIntroGuide, loading]);

  if (loading) {
    return (
      <div
        className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        <LoadingScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        <ErrorScreen message={error} />
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div
        className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
        style={canvasPageThemeStyle}
      >
        <GameEndedScreen />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[color:var(--page-theme-page-background)] text-[color:var(--page-theme-text-primary)]"
      style={canvasPageThemeStyle}
    >
      <GameHistoryPanel
        onOpenIntroGuide={handleOpenIntroGuide}
        historyItems={historyItems}
        historyLoading={historyLoading}
        historyError={historyError}
        onOpenRoundSummary={handleOpenRoundSummaryModal}
        onOpenGameSummary={handleOpenGameSummaryModal}
      />

      <CanvasStage
        containerRef={containerRef}
        overlay={
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] text-[color:var(--page-theme-primary-action)] shadow-sm hover:bg-[color:var(--page-theme-surface-secondary)]"
            aria-label={t("canvas.resetZoom")}
            title={t("canvas.resetZoom")}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              resetCanvasZoom();
            }}
          >
            ↺
          </button>
        }
        topCenterOverlay={
          selectionGuideState.roundSelectionGuideVisible ? (
            <div className="rounded-[1.5rem] border border-[rgba(0,0,0,0.18)] bg-[#FACC15] px-9 py-[18px] text-[1.6875rem] font-semibold leading-none text-black shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
              {t("canvas.roundStartedGuide", { round: roundNumber ?? "" })}
            </div>
          ) : null
        }
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        isDragging={isDraggingCanvas}
        onWheel={handleWheel}
      >
        <CanvasSurface
          paintCanvasRef={paintCanvasRef}
          canvasRef={canvasRef}
          playBackgroundImageUrl={playBackgroundImageUrl}
          resultTemplateImageUrl={resultTemplateImageUrl}
          gridX={gridX}
          gridY={gridY}
          cameraX={cameraX}
          cameraY={cameraY}
          zoom={zoom}
          worldOffset={worldOffset}
          surfaceSize={surfaceSize}
          selectionLabels={selectionLabels}
          pulsingCellKeys={selectionGuideState.pulsingSelectionCellKeys}
        />
      </CanvasStage>

      <div
        className="shrink-0 border-l border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-panel-background)]"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        {canvasId && (
          <VotePanel
            phase={phase}
            roundNumber={roundNumber}
            totalRounds={totalRounds}
            formattedGameEndTime={formattedGameEndTime}
            formattedRemainingTime={formattedRemainingTime}
            remainingSeconds={remainingSeconds}
            roundDurationSec={roundDurationSec}
            votingParticipantCount={votingParticipantCount}
            votes={votes}
            remaining={remaining}
            cells={cells}
            latestRoundSnapshot={latestRoundSnapshot}
            playBackgroundImageUrl={playBackgroundImageUrl}
            resultTemplateImageUrl={resultTemplateImageUrl}
            backgroundMode={backgroundMode}
            onBackgroundModeChange={setBackgroundMode}
            participants={participants}
            participantLoading={participantLoading}
            participantError={participantError}
            gridX={gridX}
            gridY={gridY}
            selectedCell={displaySelectedCell}
            viewport={viewport}
            onNavigateToCoordinate={navigateToCoordinate}
          />
        )}
      </div>

      {introGuideOpen && gameConfig && (
        <IntroGuideModal
          open={true}
          playBackgroundImageUrl={playBackgroundImageUrl}
          resultTemplateImageUrl={resultTemplateImageUrl}
          gridX={gridX}
          gridY={gridY}
          gameConfig={gameConfig}
          formattedGameEndTime={formattedGameEndTime}
          onClose={handleCloseIntroGuide}
        />
      )}

      {popupOpen && selectedCell && canvasId && (
        <VotePopup
          canvasId={canvasId}
          roundId={roundId}
          phase={phase}
          isRoundExpired={isRoundExpired}
          remaining={remaining}
          selectedCell={selectedCell}
          votes={votes}
          position={popupPos}
          onVoteSuccess={handleVoteSuccess}
          onColorChange={handleColorChange}
          onClose={handlePopupClose}
        />
      )}

      {!introGuideOpen && (
        <RoundSummaryModal
          open={roundSummaryOpen}
          summary={roundSummaryModal}
          snapshot={latestRoundSnapshot}
          playBackgroundImageUrl={playBackgroundImageUrl}
          position={roundSummaryPosition}
          onClose={handleCloseRoundSummaryModal}
          onDragStart={handleRoundSummaryDragStart}
        />
      )}

      {!introGuideOpen && !roundSummaryOpen && gameSummaryModal && (
        <GameSummaryModal
          summary={gameSummaryModal}
          snapshotUrl={latestRoundSnapshot}
          playBackgroundImageUrl={playBackgroundImageUrl}
          position={roundSummaryPosition}
          onDragStart={handleRoundSummaryDragStart}
          onClose={handleCloseGameSummaryModal}
        />
      )}
    </div>
  );
}
