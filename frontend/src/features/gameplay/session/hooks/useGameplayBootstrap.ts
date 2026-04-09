import { useCallback } from "react";
import { voteApi } from "@/features/gameplay/vote";
import { GAME_PHASE, isRoundActivePhase } from "../model/game-phase.types";
import { sessionApi, type RoundStateResponse } from "../api/session.api";
import { RoundInfoState, SessionBootstrapResult } from "../model/session.types";

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function getRemainingSeconds(phaseEndsAt: string | null): number | null {
  if (!phaseEndsAt) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil((new Date(phaseEndsAt).getTime() - Date.now()) / 1000),
  );
}

function getPhaseDurationSeconds(
  phaseStartedAt: string | null,
  phaseEndsAt: string | null,
): number | null {
  if (!phaseStartedAt || !phaseEndsAt) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (new Date(phaseEndsAt).getTime() - new Date(phaseStartedAt).getTime()) /
        1000,
    ),
  );
}

export function useGameplayBootstrap() {
  const bootstrap = useCallback(async (): Promise<SessionBootstrapResult> => {
    const { data } = await sessionApi.getCurrentCanvas();
    const {
      canvas,
      cells,
      roundDurationSec,
      totalRounds,
      roundStartWaitSec,
      roundResultDelaySec,
      gameEndWaitSec,
    } = data;

    let roundState: RoundStateResponse | null = null;
    let remaining: number | null = null;
    let votes: Record<string, number> = {};

    if (isRoundActivePhase(canvas.phase)) {
      const roundRes = await sessionApi.getActiveRound(canvas.id);
      roundState = roundRes.data;

      if (roundState.round?.id) {
        const [ticketsRes, voteStatusRes] = await Promise.all([
          sessionApi.getTickets(roundState.round.id),
          sessionApi.getVoteStatus(roundState.round.id),
        ]);

        remaining = ticketsRes.data.remaining;
        votes = voteStatusRes.data.status;
      }
    }

    const phaseRemainingSeconds = getRemainingSeconds(canvas.phaseEndsAt);
    const phaseDurationSeconds = getPhaseDurationSeconds(
      canvas.phaseStartedAt,
      canvas.phaseEndsAt,
    );

    const resolvedRemainingSeconds =
      roundState?.timer?.remainingSeconds ?? phaseRemainingSeconds;

    const round: RoundInfoState = {
      phase: canvas.phase,
      roundId: roundState?.round?.id ?? null,
      roundNumber:
        roundState?.round?.roundNumber ?? canvas.currentRoundNumber ?? null,
      roundDurationSec:
        roundState?.round?.roundDurationSec ??
        phaseDurationSeconds ??
        roundDurationSec ??
        null,
      totalRounds: roundState?.round?.totalRounds ?? totalRounds,
      formattedGameEndTime: roundState?.round
        ? formatClockTime(new Date(roundState.round.gameEndAt))
        : null,
      remainingSeconds: resolvedRemainingSeconds,
      formattedRemainingTime:
        resolvedRemainingSeconds !== null
          ? formatDuration(resolvedRemainingSeconds)
          : null,
      isRoundExpired:
        canvas.phase === GAME_PHASE.ROUND_RESULT ||
        canvas.phase === GAME_PHASE.GAME_END
          ? true
          : (roundState?.timer?.isRoundExpired ?? false),
      phaseStartedAt: canvas.phaseStartedAt,
      phaseEndsAt: canvas.phaseEndsAt,
    };

    return {
      canvasId: canvas.id,
      gridX: canvas.gridX,
      gridY: canvas.gridY,
      cells,
      round,
      votes,
      remaining,
      phaseTiming: {
        roundStartWaitSec,
        roundResultDelaySec,
        gameEndWaitSec,
      },
    };
  }, []);

  return {
    bootstrap,
  };
}
