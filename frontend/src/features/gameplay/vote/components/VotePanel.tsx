import type { Cell, Viewport } from "@/features/gameplay/canvas";
import { CoordinateNavigator, MiniMap } from "@/features/gameplay/canvas";
import { RoundInfo } from "@/features/gameplay/round";
import { MyInfoCard, ParticipantPanel } from "@/features/gameplay/session";
import type { ParticipantItem } from "@/features/gameplay/session/api/session.api";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import { getGameConfig } from "@/shared/config/game-config";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { MAX_VOTE_PANEL_ENTRIES } from "../model/vote.constants";
import { buildVotePanelEntries } from "../model/vote.utils";

interface Props {
  phase: GamePhase;
  roundNumber: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
  formattedRemainingTime: string | null;
  remainingSeconds: number | null;
  roundDurationSec: number | null;
  votingParticipantCount: number | null;
  votes: Record<string, number>;
  remaining: number | null;
  cells: Cell[];
  minimapCells: Cell[];
  latestRoundSnapshot: string | null;
  playBackgroundImageUrl: string | null;
  resultTemplateImageUrl: string | null;
  participants: ParticipantItem[];
  participantLoading: boolean;
  participantError: string | null;
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
  phase,
  roundNumber,
  totalRounds,
  formattedGameEndTime,
  formattedRemainingTime,
  remainingSeconds,
  roundDurationSec,
  votingParticipantCount,
  votes,
  remaining,
  cells,
  minimapCells,
  latestRoundSnapshot,
  playBackgroundImageUrl,
  resultTemplateImageUrl,
  participants,
  participantLoading,
  participantError,
  gridX,
  gridY,
  selectedCell,
  viewport,
  onNavigateToCoordinate,
}: Props) {
  const votesPerRound = getGameConfig().rules.votesPerRound;
  const voteEntries = buildVotePanelEntries(votes, cells).slice(
    0,
    MAX_VOTE_PANEL_ENTRIES,
  );
  const maxCount = voteEntries[0]?.totalCount ?? 1;
  const slots = Array.from({ length: MAX_VOTE_PANEL_ENTRIES }, (_, index) => {
    return voteEntries[index] ?? null;
  });
  const isVotingPhase = phase === GAME_PHASE.ROUND_ACTIVE;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5">
      <div className="flex flex-col items-center gap-2">
        <BrandLogo variant="wordmark" className="mx-auto w-40" />
        <MyInfoCard participants={participants} />
      </div>

      <RoundInfo
        phase={phase}
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        formattedGameEndTime={formattedGameEndTime}
        formattedRemainingTime={formattedRemainingTime}
        remainingSeconds={remainingSeconds}
        roundDurationSec={roundDurationSec}
        votingParticipantCount={votingParticipantCount}
      />

      <div className="flex min-h-2 items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
          남은 투표권
        </p>
        {isVotingPhase && remaining !== null ? (
          <span className="text-sm font-bold text-[color:var(--page-theme-primary-action)]">
            {remaining}/{votesPerRound}
          </span>
        ) : (
          <span className="text-sm text-[color:var(--page-theme-text-tertiary)]">
            -
          </span>
        )}
      </div>

      <MiniMap
        cells={minimapCells}
        snapshotUrl={latestRoundSnapshot}
        playBackgroundImageUrl={playBackgroundImageUrl}
        resultTemplateImageUrl={resultTemplateImageUrl}
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

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
          투표 현황
        </p>
        <div className="flex flex-col gap-1.5 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3">
          {slots.map((entry, index) => (
            <div key={index} className="flex h-5 items-center gap-2">
              {entry ? (
                <>
                  <div
                    className="h-3 w-3 shrink-0 rounded-sm border border-[color:var(--page-theme-border-secondary)]"
                    style={{ backgroundColor: entry.topColor }}
                  />
                  <span className="w-16 shrink-0 text-xs text-[color:var(--page-theme-text-secondary)]">
                    ({entry.x}, {entry.y})
                  </span>
                  <div className="h-2 flex-1 rounded bg-[color:var(--page-theme-surface-secondary)]">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(entry.topCount / maxCount) * 100}%`,
                        backgroundColor: entry.topColor,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-[color:var(--page-theme-text-secondary)]">
                    {entry.topCount}/{entry.totalCount}
                  </span>
                </>
              ) : (
                <div className="h-2 w-full rounded bg-[color:var(--page-theme-surface-secondary)]" />
              )}
            </div>
          ))}
        </div>
      </div>

      <ParticipantPanel
        participants={participants}
        loading={participantLoading}
        error={participantError}
      />
    </div>
  );
}
