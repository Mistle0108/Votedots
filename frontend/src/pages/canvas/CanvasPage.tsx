import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CanvasStage, CanvasSurface, PANEL_WIDTH } from "@/features/gameplay/canvas";
import { ErrorScreen, GameEndedScreen, LoadingScreen } from "@/features/gameplay/session";
import { VotePanel, VotePopup } from "@/features/gameplay/vote";
import useCanvasPage from "./model/useCanvasPage";
import type { GameSummaryData, RoundSummaryData } from "@/features/gameplay/session/api/session.api";

interface SummaryModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function SummaryModal({ title, onClose, children }: SummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
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

function RoundSummaryModal({
  summary,
  onClose,
}: {
  summary: RoundSummaryData;
  onClose: () => void;
}) {
  return (
    <SummaryModal title={`라운드 ${summary.roundNumber} 결과`} onClose={onClose}>
      <div className="flex flex-col gap-2 text-sm text-gray-700">
        <div className="flex items-center justify-between gap-3">
          <span>참여자 수</span>
          <span>{summary.participantCount}명</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>총 투표 수</span>
          <span>{summary.totalVotes}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>반영 칸 수</span>
          <span>{summary.paintedCellCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>진행률</span>
          <span>{summary.canvasProgressPercent}%</span>
        </div>
      </div>
    </SummaryModal>
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
    roundSummaryModal,
    gameSummaryModal,
    handleCloseRoundSummaryModal,
    handleCloseGameSummaryModal,
    gridX,
    gridY,
    viewport,
    navigateToCoordinate,
    resetCanvasZoom,
  } = useCanvasPage({
    onSessionEnded: handleSessionEnded,
    onUnauthorized: handleUnauthorized,
  });

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  // test 임시 수정
  if (gameEnded && !gameSummaryModal) {
    return <GameEndedScreen />;
  }

  return (
    <div className="flex h-screen w-full">
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
        <CanvasSurface canvasRef={canvasRef} />
      </CanvasStage>

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

      {roundSummaryModal && (
        <RoundSummaryModal
          summary={roundSummaryModal}
          onClose={handleCloseRoundSummaryModal}
        />
      )}

      {gameSummaryModal && (
        <GameSummaryModal
          summary={gameSummaryModal}
          onClose={handleCloseGameSummaryModal}
        />
      )}
    </div>
  );
}
