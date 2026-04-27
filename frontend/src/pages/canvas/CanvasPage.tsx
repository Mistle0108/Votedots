import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CanvasStage,
  CanvasSurface,
  PANEL_WIDTH,
} from "@/features/gameplay/canvas";
import { GameHistoryPanel } from "@/features/gameplay/history";
import { IntroGuideModal } from "@/features/gameplay/intro";
import RoundSummaryModal from "@/features/gameplay/round/components/RoundSummaryModal";
import GameSummaryModal from "@/features/gameplay/session/components/GameSummaryModal";
import {
  ErrorScreen,
  GameEndedScreen,
  LoadingScreen,
} from "@/features/gameplay/session";
import { GAME_PHASE } from "@/features/gameplay/session/model/game-phase.types";
import { VotePanel, VotePopup } from "@/features/gameplay/vote";
import { useI18n } from "@/shared/i18n";
import useCanvasPage from "./model/useCanvasPage";
import { PLAY_THEME_STYLE } from "./model/play-theme";

export default function CanvasPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [introModalDismissed, setIntroModalDismissed] = useState(false);

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
    handleWheel,
    popupOpen,
    popupPos,
    canvasId,
    phase,
    roundId,
    isRoundExpired,
    selectedCell,
    votes,
    cells,
    minimapCells,
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
    historyItems,
    historyLoading,
    historyError,
  } = useCanvasPage({
    onSessionEnded: handleSessionEnded,
    onUnauthorized: handleUnauthorized,
  });

  const canvasPageThemeStyle = PLAY_THEME_STYLE;

  useEffect(() => {
    if (phase === GAME_PHASE.INTRO && !introModalDismissed) {
      handleOpenIntroGuide();
      return;
    }

    if (phase !== GAME_PHASE.INTRO) {
      handleCloseIntroGuide();
      setIntroModalDismissed(false);
    }
  }, [handleCloseIntroGuide, handleOpenIntroGuide, introModalDismissed, phase]);

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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
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
            minimapCells={minimapCells}
            latestRoundSnapshot={latestRoundSnapshot}
            playBackgroundImageUrl={playBackgroundImageUrl}
            resultTemplateImageUrl={resultTemplateImageUrl}
            participants={participants}
            participantLoading={participantLoading}
            participantError={participantError}
            gridX={gridX}
            gridY={gridY}
            selectedCell={selectedCell}
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
          onClose={() => {
            setIntroModalDismissed(true);
            handleCloseIntroGuide();
          }}
        />
      )}

      {popupOpen && selectedCell && canvasId && (
        <VotePopup
          canvasId={canvasId}
          roundId={roundId}
          phase={phase}
          isRoundExpired={isRoundExpired}
          selectedCell={selectedCell}
          votes={votes}
          cells={cells}
          position={popupPos}
          onVoteSuccess={handleVoteSuccess}
          onColorChange={handleColorChange}
          onClose={handlePopupClose}
        />
      )}

      <RoundSummaryModal
        open={roundSummaryOpen}
        summary={roundSummaryModal}
        snapshot={latestRoundSnapshot}
        position={roundSummaryPosition}
        onClose={handleCloseRoundSummaryModal}
        onDragStart={handleRoundSummaryDragStart}
      />

      {gameSummaryModal && (
        <GameSummaryModal
          summary={gameSummaryModal}
          snapshotUrl={latestRoundSnapshot}
          onClose={handleCloseGameSummaryModal}
        />
      )}
    </div>
  );
}
