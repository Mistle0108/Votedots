import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CanvasStage,
  CanvasSurface,
  PANEL_WIDTH,
} from "@/features/gameplay/canvas";
import { IntroGuideModal } from "@/features/gameplay/intro"; // 추가: INTRO 안내 모달
import {
  ErrorScreen,
  GameEndedScreen,
  LoadingScreen,
} from "@/features/gameplay/session";
import { GAME_PHASE } from "@/features/gameplay/session/model/game-phase.types"; // 추가: INTRO phase 판별
import { VotePanel, VotePopup } from "@/features/gameplay/vote";
import useCanvasPage from "./model/useCanvasPage";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";

// to-be
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

function RoundSummaryModal({
  summary,
  onClose,
}: {
  summary: RoundSummaryData;
  onClose: () => void;
}) {
  const hasMostVotedCell =
    summary.mostVotedCellX !== null && summary.mostVotedCellY !== null;

  const progressPercent =
    summary.totalCellCount > 0
      ? ((summary.currentPaintedCellCount / summary.totalCellCount) * 100).toFixed(1)
      : 0;

  return (
    <SummaryModal
      title={`${summary.roundNumber} 라운드 결과`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="space-y-1 text-center">
          <p className="text-sm text-gray-500">이번 라운드 결과를 정리했어요</p>
        </section>

        <section className="space-y-3 text-left text-[15px] font-bold leading-7 text-gray-700">
          <p>
            {summary.participantCount > 0 ? (
              <>
                <span className="text-[22px] text-red-500">
                  {summary.participantCount}
                </span>
                명이 투표에 참여했어요
              </>
            ) : (
              "참여자가 없어요."
            )}
          </p>
          <p>
            이번 라운드에 총{" "}
            <span className="text-[22px] text-red-500">{summary.totalVotes}</span>
            {" "}표를 모았어요.
          </p>
          <p>
            이번 라운드에서 총{" "}
            <span className="text-[22px] text-red-500">
              {summary.paintedCellCount}
            </span>
            {" "}개를 색칠했어요.
          </p>
          <p>
            캔버스 진행도는 {" "}
            <span className="text-[22px] text-red-500">{progressPercent}</span>
            {" "}% 입니다.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm leading-6 text-gray-700">
          <p>
            가장 인기 있던 칸은{" "}
            <span className="font-bold text-gray-900">
              {hasMostVotedCell
                ? `(${summary.mostVotedCellX}, ${summary.mostVotedCellY})`
                : "없어요"}
            </span>
            {hasMostVotedCell ? " 예요." : ""}
          </p>
          <p>
            동점 추첨으로 결정된 칸은{" "}
            <span className="font-bold text-gray-900">
              {summary.randomResolvedCellCount > 0
                ? summary.randomResolvedCellCount
                : "없어요."}
            </span>
            {summary.randomResolvedCellCount > 0 ? "개였어요." : ""}
          </p>
        </section>
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
          <span>{summary.participantCount} 명</span>
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
  const [introModalDismissed, setIntroModalDismissed] = useState(false); // 추가: INTRO 중 사용자가 닫은 상태 보관

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
    gameConfig,
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

  if (phase !== GAME_PHASE.INTRO && introModalDismissed) {
    setIntroModalDismissed(false); // 추가: INTRO이 끝났다가 다음 게임 INTRO이 오면 다시 모달 표시
  }

  useEffect(() => {
    if (phase !== GAME_PHASE.INTRO) {
      setIntroModalDismissed(false); // 변경: INTRO이 아닐 때 닫힘 상태 초기화
    }
  }, [phase]);

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

      <IntroGuideModal
        open={
          phase === GAME_PHASE.INTRO &&
          !introModalDismissed &&
          !!gameConfig &&
          cells.length > 0
        } // 추가: INTRO phase에서만 전체 캔버스 안내 모달 표시
        cells={cells}
        gridX={gridX}
        gridY={gridY}
        gameConfig={gameConfig!}
        formattedGameEndTime={formattedGameEndTime}
        onClose={() => setIntroModalDismissed(true)}
      />

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
