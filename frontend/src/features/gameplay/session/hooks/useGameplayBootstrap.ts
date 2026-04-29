import { useCallback } from "react";
import { voteApi } from "@/features/gameplay/vote";
import {
  resolvePlayBackgroundImageUrl,
  resolveResultTemplateImageUrl,
} from "@/features/gameplay/canvas/model/background-assets";
import { setGameConfig } from "@/shared/config/game-config";
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

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + Math.max(0, seconds) * 1000);
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPhaseEndDate(
  phaseStartedAt: string | null,
  phaseEndsAt: string | null,
  fallbackDurationSec: number,
): Date | null {
  const explicitPhaseEnd = parseDate(phaseEndsAt);

  if (explicitPhaseEnd) {
    return explicitPhaseEnd;
  }

  const phaseStart = parseDate(phaseStartedAt);

  if (!phaseStart) {
    return null;
  }

  return addSeconds(phaseStart, fallbackDurationSec);
}

function getEstimatedGameEndFromRoundStart(
  roundStartedAt: Date,
  currentRoundNumber: number,
  totalRounds: number,
  roundDurationSec: number,
  roundResultDelaySec: number,
): Date | null {
  const remainingRoundsIncludingCurrent =
    totalRounds - currentRoundNumber + 1;

  if (remainingRoundsIncludingCurrent <= 0) {
    return null;
  }

  const remainingSeconds =
    remainingRoundsIncludingCurrent * roundDurationSec +
    Math.max(0, remainingRoundsIncludingCurrent - 1) * roundResultDelaySec;

  return addSeconds(roundStartedAt, remainingSeconds);
}

function getEstimatedGameEndAt({
  phase,
  phaseStartedAt,
  phaseEndsAt,
  currentRoundNumber,
  totalRounds,
  introPhaseSec,
  roundStartWaitSec,
  roundDurationSec,
  roundResultDelaySec,
}: {
  phase: string;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  currentRoundNumber: number | null;
  totalRounds: number;
  introPhaseSec: number;
  roundStartWaitSec: number;
  roundDurationSec: number;
  roundResultDelaySec: number;
}): Date | null {
  const safeRoundNumber = Math.max(1, currentRoundNumber ?? 1);

  switch (phase) {
    case GAME_PHASE.INTRO: {
      const introEndsAt = getPhaseEndDate(
        phaseStartedAt,
        phaseEndsAt,
        introPhaseSec,
      );

      if (!introEndsAt) {
        return null;
      }

      return getEstimatedGameEndFromRoundStart(
        addSeconds(introEndsAt, roundStartWaitSec),
        1,
        totalRounds,
        roundDurationSec,
        roundResultDelaySec,
      );
    }

    case GAME_PHASE.ROUND_START_WAIT: {
      const roundStartedAt = getPhaseEndDate(
        phaseStartedAt,
        phaseEndsAt,
        roundStartWaitSec,
      );

      if (!roundStartedAt) {
        return null;
      }

      return getEstimatedGameEndFromRoundStart(
        roundStartedAt,
        safeRoundNumber,
        totalRounds,
        roundDurationSec,
        roundResultDelaySec,
      );
    }

    case GAME_PHASE.ROUND_ACTIVE: {
      const roundStartedAt = parseDate(phaseStartedAt);

      if (!roundStartedAt) {
        return null;
      }

      return getEstimatedGameEndFromRoundStart(
        roundStartedAt,
        safeRoundNumber,
        totalRounds,
        roundDurationSec,
        roundResultDelaySec,
      );
    }

    case GAME_PHASE.ROUND_RESULT: {
      const resultStartedAt = parseDate(phaseStartedAt);

      if (!resultStartedAt) {
        return null;
      }

      const remainingRounds = Math.max(0, totalRounds - safeRoundNumber);
      const remainingSeconds =
        remainingRounds * roundDurationSec +
        remainingRounds * roundResultDelaySec;

      return addSeconds(resultStartedAt, remainingSeconds);
    }

    case GAME_PHASE.GAME_END:
      return parseDate(phaseStartedAt);

    default:
      return null;
  }
}

function getFallbackPhaseDuration(
  phase: string,
  phaseDurationSeconds: number | null,
  introPhaseSec: number,
  roundStartWaitSec: number,
  roundDurationSec: number,
  roundResultDelaySec: number,
  gameEndWaitSec: number,
): number | null {
  if (phaseDurationSeconds !== null) {
    return phaseDurationSeconds;
  }

  switch (phase) {
    case GAME_PHASE.INTRO:
      return introPhaseSec;
    case GAME_PHASE.ROUND_START_WAIT:
      return roundStartWaitSec;
    case GAME_PHASE.ROUND_ACTIVE:
      return roundDurationSec;
    case GAME_PHASE.ROUND_RESULT:
      return roundResultDelaySec;
    case GAME_PHASE.GAME_END:
      return gameEndWaitSec;
    default:
      return null;
  }
}

export function useGameplayBootstrap() {
  const bootstrap = useCallback(async (): Promise<SessionBootstrapResult> => {
    const { data } = await sessionApi.getCurrentCanvas();
    const { canvas, gameConfig } = data;
    const { phases, rules } = gameConfig;

    setGameConfig(gameConfig);

    let roundState: RoundStateResponse | null = null;
    let remaining: number | null = null;
    let votes: Record<string, number> = {};

    if (
      isRoundActivePhase(canvas.phase) ||
      canvas.phase === GAME_PHASE.ROUND_RESULT
    ) {
      const roundRes = await sessionApi.getActiveRound(canvas.id);
      roundState = roundRes.data;

      if (isRoundActivePhase(canvas.phase) && roundState.round?.id) {
        const [ticketsRes, voteStatusRes] = await Promise.all([
          voteApi.getTickets(roundState.round.id),
          voteApi.getStatus(roundState.round.id),
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

    const resolvedRoundDurationSec =
      roundState?.round?.roundDurationSec ??
      getFallbackPhaseDuration(
        canvas.phase,
        phaseDurationSeconds,
        phases.introPhaseSec,
        phases.roundStartWaitSec,
        phases.roundDurationSec,
        phases.roundResultDelaySec,
        phases.gameEndWaitSec,
      );

    const estimatedGameEndAt = getEstimatedGameEndAt({
      phase: canvas.phase,
      phaseStartedAt: canvas.phaseStartedAt,
      phaseEndsAt: canvas.phaseEndsAt,
      currentRoundNumber: canvas.currentRoundNumber,
      totalRounds: rules.totalRounds,
      introPhaseSec: phases.introPhaseSec,
      roundStartWaitSec: phases.roundStartWaitSec,
      roundDurationSec: phases.roundDurationSec,
      roundResultDelaySec: phases.roundResultDelaySec,
    });

    const round: RoundInfoState = {
      phase: canvas.phase,
      roundId: roundState?.round?.id ?? null,
      roundNumber:
        roundState?.round?.roundNumber ?? canvas.currentRoundNumber ?? null,
      roundDurationSec: resolvedRoundDurationSec,
      totalRounds: roundState?.round?.totalRounds ?? rules.totalRounds,
      formattedGameEndTime: roundState?.round
        ? formatClockTime(new Date(roundState.round.gameEndAt))
        : estimatedGameEndAt
          ? formatClockTime(estimatedGameEndAt)
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
      playBackgroundImageUrl: resolvePlayBackgroundImageUrl({
        playBackgroundAssetKey: canvas.playBackgroundAssetKey,
      }),
      resultTemplateImageUrl: resolveResultTemplateImageUrl({
        resultTemplateAssetKey: canvas.resultTemplateAssetKey,
      }),
      round,
      votes,
      remaining,
      phaseTiming: {
        introPhaseSec: phases.introPhaseSec,
        roundStartWaitSec: phases.roundStartWaitSec,
        roundResultDelaySec: phases.roundResultDelaySec,
        gameEndWaitSec: phases.gameEndWaitSec,
      },
      gameConfig,
    };
  }, []);

  return {
    bootstrap,
  };
}
