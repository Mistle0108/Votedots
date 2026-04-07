import { useCallback } from "react";
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

export function useGameplayBootstrap() {
  const bootstrap = useCallback(async (): Promise<SessionBootstrapResult> => {
    const { data } = await sessionApi.getCurrentCanvas();
    const { canvas, cells } = data;

    let roundState: RoundStateResponse | null = null;
    let remaining: number | null = null;

    if (isRoundActivePhase(canvas.phase)) {
      const roundRes = await sessionApi.getActiveRound(canvas.id);
      roundState = roundRes.data;

      if (roundState.round?.id) {
        const ticketsRes = await sessionApi.getTickets(roundState.round.id);
        remaining = ticketsRes.data.remaining;
      }
    }

    const round: RoundInfoState = {
      phase: canvas.phase,
      roundId: roundState?.round?.id ?? null,
      roundNumber:
        roundState?.round?.roundNumber ?? canvas.currentRoundNumber ?? null,
      roundDurationSec: roundState?.round?.roundDurationSec ?? null,
      totalRounds: roundState?.round?.totalRounds ?? 0,
      formattedGameEndTime: roundState?.round
        ? formatClockTime(new Date(roundState.round.gameEndAt))
        : null,
      remainingSeconds: roundState?.timer?.remainingSeconds ?? null,
      formattedRemainingTime: roundState?.timer
        ? formatDuration(roundState.timer.remainingSeconds)
        : canvas.phase === GAME_PHASE.GAME_END
          ? formatDuration(0)
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
      remaining,
    };
  }, []);

  return {
    bootstrap,
  };
}
