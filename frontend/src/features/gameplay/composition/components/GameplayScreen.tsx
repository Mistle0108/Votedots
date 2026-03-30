import {
  CanvasStage,
  CanvasSurface,
  PANEL_WIDTH,
} from "@/features/gameplay/canvas";
import {
  ErrorScreen,
  GameEndedScreen,
  LoadingScreen,
} from "@/features/gameplay/session";
import { VotePanel, VotePopup } from "@/features/gameplay/vote";
import { useGameplayComposition } from "../hooks/useGameplayComposition";

export default function GameplayScreen() {
  const {
    loading,
    error,
    gameEnded,
    stageProps,
    surfaceProps,
    popupProps,
    panelProps,
  } = useGameplayComposition();

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
      <CanvasStage {...stageProps}>
        <CanvasSurface {...surfaceProps} />
      </CanvasStage>

      {popupProps && <VotePopup {...popupProps} />}

      <div
        className="shrink-0 border-l border-gray-200 bg-white"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        {panelProps && <VotePanel {...panelProps} />}
      </div>
    </div>
  );
}
