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

  if (gameEnded) {
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
    </div>
  );
}
