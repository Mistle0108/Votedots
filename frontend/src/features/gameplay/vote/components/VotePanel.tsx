import { useEffect, useRef, useState } from "react";
import type { Cell, Viewport } from "@/features/gameplay/canvas";
import type { PlayBackgroundMode } from "@/features/gameplay/canvas/model/background-assets";
import { MiniMap } from "@/features/gameplay/canvas";
import { RoundInfo } from "@/features/gameplay/round";
import { MyInfoCard, ParticipantPanel } from "@/features/gameplay/session";
import type { ParticipantItem } from "@/features/gameplay/session/api/session.api";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import { getGameConfig } from "@/shared/config/game-config";
import { useI18n } from "@/shared/i18n";
import { BrandLogo } from "@/shared/ui/brand-logo";
import settingsIcon from "@/assets/settings-icon.png";
import VotePanelSettings from "./VotePanelSettings";
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
  latestRoundSnapshot: string | null;
  playBackgroundImageUrl: string | null;
  resultTemplateImageUrl: string | null;
  backgroundMode: PlayBackgroundMode;
  onBackgroundModeChange: (mode: PlayBackgroundMode) => void;
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
  latestRoundSnapshot,
  playBackgroundImageUrl,
  resultTemplateImageUrl,
  backgroundMode,
  onBackgroundModeChange,
  participants,
  participantLoading,
  participantError,
  gridX,
  gridY,
  selectedCell,
  viewport,
  onNavigateToCoordinate,
}: Props) {
  const { locale, setLocale, t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (!target) {
        return;
      }

      if (settingsButtonRef.current?.contains(target)) {
        return;
      }

      if (settingsMenuRef.current?.contains(target)) {
        return;
      }

      setIsSettingsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen]);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5">
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex w-full justify-end">
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] text-sm font-semibold text-[color:var(--page-theme-text-secondary)] shadow-sm transition hover:bg-[color:var(--page-theme-surface-secondary)] hover:text-[color:var(--page-theme-text-primary)]"
            aria-label="Settings"
            aria-expanded={isSettingsOpen}
          >
            <img
              src={settingsIcon}
              alt=""
              className="h-4.5 w-4.5 object-contain"
              draggable={false}
            />
          </button>

          {isSettingsOpen ? (
            <VotePanelSettings
              ref={settingsMenuRef}
              locale={locale}
              onLocaleChange={setLocale}
              backgroundMode={backgroundMode}
              onBackgroundModeChange={onBackgroundModeChange}
            />
          ) : null}
        </div>

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
          {t("vote.remainingVotes")}
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

      <div className="shrink-0">
        <MiniMap
          snapshotUrl={latestRoundSnapshot}
          playBackgroundImageUrl={playBackgroundImageUrl}
          resultTemplateImageUrl={resultTemplateImageUrl}
          gridX={gridX}
          gridY={gridY}
          viewport={viewport}
          selectedCell={selectedCell}
          onNavigate={onNavigateToCoordinate}
        />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
          {t("vote.status")}
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
              ) : null}
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
