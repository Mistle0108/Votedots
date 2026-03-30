import { RoundInfo } from "@/features/gameplay/round";
import {
  CoordinateNavigator,
  MiniMap,
  Cell,
  Viewport,
} from "@/features/gameplay/canvas";
import VoteTickets from "./VoteTickets";
import VoteStatusBoard from "./VoteStatusBoard";

interface VotePanelProps {
  roundNumber: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
  formattedRemainingTime: string | null;
  remainingSeconds: number | null;
  roundDurationSec: number | null;
  votes: Record<string, number>;
  remaining: number | null;
  cells: Cell[];
  gridX: number;
  gridY: number;
  selectedCell: Cell | null;
  viewport: Viewport | null;
  onNavigateToCoordinate: (
    x: number,
    y: number,
    behavior?: ScrollBehavior,
  ) => void;
}

export default function VotePanel({
  roundNumber,
  totalRounds,
  formattedGameEndTime,
  formattedRemainingTime,
  remainingSeconds,
  roundDurationSec,
  votes,
  remaining,
  cells,
  gridX,
  gridY,
  selectedCell,
  viewport,
  onNavigateToCoordinate,
}: VotePanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <h2 className="text-lg font-bold">VoteDots</h2>

      <RoundInfo
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        formattedGameEndTime={formattedGameEndTime}
        formattedRemainingTime={formattedRemainingTime}
        remainingSeconds={remainingSeconds}
        roundDurationSec={roundDurationSec}
      />

      <VoteTickets remaining={remaining} />

      <MiniMap
        cells={cells}
        gridX={gridX}
        gridY={gridY}
        viewport={viewport}
        selectedCell={selectedCell}
        onNavigate={onNavigateToCoordinate}
      />

      <CoordinateNavigator
        gridX={gridX}
        gridY={gridY}
        selectedX={selectedCell?.x ?? null}
        selectedY={selectedCell?.y ?? null}
        onNavigate={onNavigateToCoordinate}
      />

      <VoteStatusBoard votes={votes} cells={cells} />
    </div>
  );
}
