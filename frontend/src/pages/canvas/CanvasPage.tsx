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
import type { GameSummaryData } from "@/features/gameplay/session/api/session.api";
import {
  ErrorScreen,
  GameEndedScreen,
  LoadingScreen,
} from "@/features/gameplay/session";
import { GAME_PHASE } from "@/features/gameplay/session/model/game-phase.types";
import { VotePanel, VotePopup } from "@/features/gameplay/vote";
import useCanvasPage from "./model/useCanvasPage";

interface SummaryModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function SummaryModal({ title, onClose, children }: SummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-[560px] rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function GameSummaryModal({
  summary,
  onClose,
}: {
  summary: GameSummaryData;
  onClose: () => void;
}) {
  return (
    <SummaryModal title="게임 종료 결과" onClose={onClose}>
      <div className="flex flex-col gap-2 text-sm text-gray-700">
        <div className="flex items-center justify-between gap-3">
          <span>총 라운드 수</span>
          <span>{summary.totalRounds}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>참여자 수</span>
          <span>{summary.participantCount}명</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>총 투표 수</span>
          <span>{summary.totalVotes}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>완성도</span>
          <span>{summary.canvasCompletionPercent}%</span>
        </div>
      </div>
    </SummaryModal>
  );
}

export default function CanvasPage() {
  const navigate = useNavigate();
  const [introModalDismissed, setIntroModalDismissed] = useState(false);

  const handleSessionEnded = useCallback(() => {
    window.alert("세션이 종료되었습니다. 다시 로그인해 주세요.");
    navigate("/login", { replace: true });
  }, [navigate]);

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
    latestRoundSummary,
    latestRoundSnapshot,
    isLatestRoundSummaryEnabled,
    historyItems,
    historyLoading,
    historyError,
  } = useCanvasPage({
    onSessionEnded: handleSessionEnded,
    onUnauthorized: handleUnauthorized,
  });

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
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (gameEnded) {
    return <GameEndedScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50">
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
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            aria-label="초기 줌 비율로 복귀"
            title="초기 줌 비율로 복귀"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              resetCanvasZoom();
            }}
          >
            ⟲
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
          backgroundImageUrl={backgroundImageUrl}
          gridX={gridX}
          gridY={gridY}
          cameraX={cameraX}
          cameraY={cameraY}
          zoom={zoom}
        />
      </CanvasStage>

      <div
        className="shrink-0 border-l border-gray-200 bg-white"
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
            backgroundImageUrl={backgroundImageUrl}
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
          backgroundImageUrl={backgroundImageUrl}
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
          onClose={handleCloseGameSummaryModal}
        />
      )}
    </div>
  );
}
