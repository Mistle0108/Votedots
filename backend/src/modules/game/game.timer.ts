import { Server } from "socket.io";
import { gameConfig } from "../../config/game.config";
import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import { roundService } from "../round/round.service";
import { GamePhase } from "./game-phase.types";

const canvasRepository = AppDataSource.getRepository(Canvas);

// Manage the next scheduled phase transition per canvas.
const activeTimers = new Map<number, NodeJS.Timeout>();

// Manage round timer broadcast intervals per canvas.
const activeBroadcasts = new Map<number, NodeJS.Timeout>();

function getGameEndAt(roundStartedAt: Date, currentRound: number): Date {
  const remainingRoundsIncludingCurrent =
    gameConfig.totalRounds - currentRound + 1;

  return new Date(
    roundStartedAt.getTime() +
      remainingRoundsIncludingCurrent * gameConfig.roundDurationSec * 1000 +
      Math.max(0, remainingRoundsIncludingCurrent - 1) *
        gameConfig.roundResultDelaySec *
        1000,
  );
}

function clearScheduledTimer(canvasId: number): void {
  const timer = activeTimers.get(canvasId);

  if (!timer) {
    return;
  }

  clearTimeout(timer);
  activeTimers.delete(canvasId);
}

function clearBroadcastInterval(canvasId: number): void {
  const interval = activeBroadcasts.get(canvasId);

  if (!interval) {
    return;
  }

  clearInterval(interval);
  activeBroadcasts.delete(canvasId);
}

function scheduleTimer(
  canvasId: number,
  callback: () => void,
  delayMs: number,
): void {
  clearScheduledTimer(canvasId);

  const timer = setTimeout(() => {
    activeTimers.delete(canvasId);
    callback();
  }, delayMs);

  activeTimers.set(canvasId, timer);
}

async function transitionToRoundStartWait(
  io: Server,
  canvasId: number,
  roundNumber: number,
): Promise<void> {
  const phaseStartedAt = new Date();
  const phaseEndsAt = new Date(
    phaseStartedAt.getTime() + gameConfig.roundStartWaitSec * 1000,
  );

  await canvasRepository.update(canvasId, {
    phase: GamePhase.ROUND_START_WAIT,
    phaseStartedAt,
    phaseEndsAt,
    currentRoundNumber: roundNumber,
  });

  scheduleTimer(
    canvasId,
    () => {
      void runRound(io, canvasId, roundNumber);
    },
    gameConfig.roundStartWaitSec * 1000,
  );
}

async function transitionToGameEnd(
  io: Server,
  canvasId: number,
  roundNumber: number,
): Promise<void> {
  const phaseStartedAt = new Date();
  const phaseEndsAt = new Date(
    phaseStartedAt.getTime() + gameConfig.gameEndWaitSec * 1000,
  );

  await canvasRepository.update(canvasId, {
    status: CanvasStatus.FINISHED,
    phase: GamePhase.GAME_END,
    phaseStartedAt,
    phaseEndsAt,
    currentRoundNumber: roundNumber,
    endedAt: phaseStartedAt,
  });

  scheduleTimer(
    canvasId,
    () => {
      io.to(`canvas:${canvasId}`).emit("game:ended", { canvasId });
    },
    gameConfig.gameEndWaitSec * 1000,
  );
}

async function runRound(
  io: Server,
  canvasId: number,
  expectedRoundNumber: number,
): Promise<void> {
  if (expectedRoundNumber > gameConfig.totalRounds) {
    await transitionToGameEnd(io, canvasId, gameConfig.totalRounds);
    return;
  }

  let round;

  try {
    round = await roundService.startRound(canvasId, io);
  } catch (err) {
    console.error(
      `[game-timer] failed to start round (canvasId=${canvasId}, round=${expectedRoundNumber}):`,
      err,
    );
    clearScheduledTimer(canvasId);
    clearBroadcastInterval(canvasId);
    return;
  }

  const gameEndAt = getGameEndAt(round.startedAt, round.roundNumber);

  const broadcastTimerUpdate = (
    remainingSecondsOverride?: number,
    isRoundExpiredOverride?: boolean,
  ) => {
    const elapsed = Math.floor((Date.now() - round.startedAt.getTime()) / 1000);

    const remainingSeconds =
      remainingSecondsOverride ??
      Math.max(0, gameConfig.roundDurationSec - elapsed);

    const isRoundExpired = isRoundExpiredOverride ?? remainingSeconds === 0;

    io.to(`canvas:${canvasId}`).emit("timer:update", {
      roundId: round.id,
      roundNumber: round.roundNumber,
      remainingSeconds,
      isRoundExpired,
      roundDurationSec: gameConfig.roundDurationSec,
      totalRounds: gameConfig.totalRounds,
      gameEndAt: gameEndAt.toISOString(),
    });
  };

  broadcastTimerUpdate();

  const broadcastInterval = setInterval(() => {
    broadcastTimerUpdate();
  }, 1000);

  activeBroadcasts.set(canvasId, broadcastInterval);

  scheduleTimer(
    canvasId,
    () => {
      void (async () => {
        clearBroadcastInterval(canvasId);
        broadcastTimerUpdate(0, true);

        try {
          await roundService.endRound(canvasId, round.id, io);
        } catch (err) {
          console.error(
            `[game-timer] failed to end round (canvasId=${canvasId}, roundId=${round.id}):`,
            err,
          );
          clearScheduledTimer(canvasId);
          return;
        }

        if (round.roundNumber >= gameConfig.totalRounds) {
          scheduleTimer(
            canvasId,
            () => {
              void transitionToGameEnd(io, canvasId, round.roundNumber);
            },
            gameConfig.roundResultDelaySec * 1000,
          );

          return;
        }

        scheduleTimer(
          canvasId,
          () => {
            void transitionToRoundStartWait(
              io,
              canvasId,
              round.roundNumber + 1,
            );
          },
          gameConfig.roundResultDelaySec * 1000,
        );
      })();
    },
    gameConfig.roundDurationSec * 1000,
  );
}

export async function startGameTimer(
  io: Server,
  canvasId: number,
): Promise<void> {
  if (activeTimers.has(canvasId)) {
    console.log(`[game-timer] already running for canvasId=${canvasId}`);
    return;
  }

  const canvas = await canvasRepository.findOne({
    where: { id: canvasId },
  });

  if (!canvas) {
    throw new Error(`Canvas was not found. (id=${canvasId})`);
  }

  const initialRoundNumber =
    canvas.currentRoundNumber > 0 ? canvas.currentRoundNumber : 1;

  if (canvas.phase === GamePhase.ROUND_START_WAIT) {
    const delayMs = Math.max(
      0,
      (canvas.phaseEndsAt?.getTime() ?? Date.now()) - Date.now(),
    );

    scheduleTimer(
      canvasId,
      () => {
        void runRound(io, canvasId, initialRoundNumber);
      },
      delayMs,
    );

    return;
  }

  await transitionToRoundStartWait(io, canvasId, initialRoundNumber);
}

export function stopGameTimer(canvasId: number): void {
  clearScheduledTimer(canvasId);
  clearBroadcastInterval(canvasId);

  console.log(`[game-timer] stopped for canvasId=${canvasId}`);
}
