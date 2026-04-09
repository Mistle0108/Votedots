import { Server } from "socket.io";
import { gameConfig } from "../../config/game.config";
import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { roundService } from "../round/round.service";
import { GamePhase } from "./game-phase.types";

const canvasRepository = AppDataSource.getRepository(Canvas);
const roundRepository = AppDataSource.getRepository(VoteRound);

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

function logPhaseChange(params: {
  canvasId: number;
  phase: GamePhase;
  roundNumber: number;
  phaseStartedAt: Date;
  phaseEndsAt: Date | null;
  reason: string;
}): void {
  const { canvasId, phase, roundNumber, phaseStartedAt, phaseEndsAt, reason } =
    params;

  console.log(
    `[phase] ${reason} | canvas=${canvasId} phase=${phase} round=${roundNumber} started=${phaseStartedAt.toISOString()} ends=${phaseEndsAt?.toISOString() ?? "null"}`,
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

function clearCanvasTimers(canvasId: number): void {
  clearScheduledTimer(canvasId);
  clearBroadcastInterval(canvasId);
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

async function createNextCanvas(io: Server): Promise<void> {
  const { canvasService } = await import("../canvas/canvas.service");
  await canvasService.create(io);
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

  logPhaseChange({
    canvasId,
    phase: GamePhase.ROUND_START_WAIT,
    roundNumber,
    phaseStartedAt,
    phaseEndsAt,
    reason: "round start wait transition",
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

  logPhaseChange({
    canvasId,
    phase: GamePhase.GAME_END,
    roundNumber,
    phaseStartedAt,
    phaseEndsAt,
    reason: "game end transition",
  });

  scheduleGameEnd(io, canvasId, roundNumber, phaseEndsAt);
}

function scheduleGameEnd(
  io: Server,
  canvasId: number,
  roundNumber: number,
  phaseEndsAt: Date,
): void {
  const delayMs = Math.max(0, phaseEndsAt.getTime() - Date.now());

  scheduleTimer(
    canvasId,
    () => {
      void (async () => {
        io.to(`canvas:${canvasId}`).emit("game:ended", { canvasId });

        try {
          await createNextCanvas(io);
        } catch (err) {
          console.error(
            `[game-timer] failed to create next canvas after game end (previousCanvasId=${canvasId}, round=${roundNumber}):`,
            err,
          );
        }
      })();
    },
    delayMs,
  );
}

function startRoundBroadcast(
  io: Server,
  canvasId: number,
  round: VoteRound,
): (
  remainingSecondsOverride?: number,
  isRoundExpiredOverride?: boolean,
) => void {
  clearBroadcastInterval(canvasId);

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

  return broadcastTimerUpdate;
}

function scheduleRoundCompletion(
  io: Server,
  canvasId: number,
  round: VoteRound,
  roundEndsAt: Date,
): void {
  const broadcastTimerUpdate = startRoundBroadcast(io, canvasId, round);
  const delayMs = Math.max(0, roundEndsAt.getTime() - Date.now());

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

        scheduleTimer(
          canvasId,
          () => {
            void (async () => {
              try {
                await transitionAfterRoundResult(
                  io,
                  canvasId,
                  round.roundNumber,
                );
              } catch (error) {
                console.error(
                  `[game-timer] failed to transition after round result (canvasId=${canvasId}, round=${round.roundNumber}):`,
                  error,
                );
                clearScheduledTimer(canvasId);
              }
            })();
          },
          gameConfig.roundResultDelaySec * 1000,
        );
      })();
    },
    delayMs,
  );
}

async function transitionAfterRoundResult(
  io: Server,
  canvasId: number,
  roundNumber: number,
): Promise<void> {
  if (roundNumber >= gameConfig.totalRounds) {
    await transitionToGameEnd(io, canvasId, roundNumber);
    return;
  }

  await transitionToRoundStartWait(io, canvasId, roundNumber + 1);
}

async function resumeRoundStartWaitFromBoundary(
  io: Server,
  canvasId: number,
  nextRoundNumber: number,
  waitStartedAt: Date,
): Promise<void> {
  const waitEndsAt = new Date(
    waitStartedAt.getTime() + gameConfig.roundStartWaitSec * 1000,
  );

  await canvasRepository.update(canvasId, {
    phase: GamePhase.ROUND_START_WAIT,
    phaseStartedAt: waitStartedAt,
    phaseEndsAt: waitEndsAt,
    currentRoundNumber: nextRoundNumber,
  });

  logPhaseChange({
    canvasId,
    phase: GamePhase.ROUND_START_WAIT,
    roundNumber: nextRoundNumber,
    phaseStartedAt: waitStartedAt,
    phaseEndsAt: waitEndsAt,
    reason: "round start wait resume",
  });

  const delayMs = Math.max(0, waitEndsAt.getTime() - Date.now());

  if (delayMs === 0) {
    await runRound(io, canvasId, nextRoundNumber);
    return;
  }

  scheduleTimer(
    canvasId,
    () => {
      void runRound(io, canvasId, nextRoundNumber);
    },
    delayMs,
  );
}

async function resumeGameEndFromBoundary(
  io: Server,
  canvasId: number,
  roundNumber: number,
  gameEndStartedAt: Date,
): Promise<void> {
  const gameEndEndsAt = new Date(
    gameEndStartedAt.getTime() + gameConfig.gameEndWaitSec * 1000,
  );

  await canvasRepository.update(canvasId, {
    status: CanvasStatus.FINISHED,
    phase: GamePhase.GAME_END,
    phaseStartedAt: gameEndStartedAt,
    phaseEndsAt: gameEndEndsAt,
    currentRoundNumber: roundNumber,
    endedAt: gameEndStartedAt,
  });

  logPhaseChange({
    canvasId,
    phase: GamePhase.GAME_END,
    roundNumber,
    phaseStartedAt: gameEndStartedAt,
    phaseEndsAt: gameEndEndsAt,
    reason: "game end resume",
  });

  if (gameEndEndsAt.getTime() <= Date.now()) {
    io.to(`canvas:${canvasId}`).emit("game:ended", { canvasId });

    try {
      await createNextCanvas(io);
    } catch (error) {
      console.error(
        `[game-timer] failed to create next canvas after elapsed game-end resume (previousCanvasId=${canvasId}):`,
        error,
      );
    }
    return;
  }

  scheduleGameEnd(io, canvasId, roundNumber, gameEndEndsAt);
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

  let round: VoteRound;

  try {
    round = await roundService.startRound(canvasId, io);
  } catch (err) {
    console.error(
      `[game-timer] failed to start round (canvasId=${canvasId}, round=${expectedRoundNumber}):`,
      err,
    );
    clearCanvasTimers(canvasId);
    return;
  }

  const roundEndsAt = new Date(
    round.startedAt.getTime() + gameConfig.roundDurationSec * 1000,
  );

  scheduleRoundCompletion(io, canvasId, round, roundEndsAt);
}

async function resumeRoundActive(io: Server, canvas: Canvas): Promise<void> {
  const activeRound = await roundRepository.findOne({
    where: { canvas: { id: canvas.id }, isActive: true },
    order: { roundNumber: "DESC" },
  });

  if (!activeRound) {
    console.warn(
      `[game-timer] active phase without active round detected (canvasId=${canvas.id})`,
    );

    if (canvas.currentRoundNumber >= gameConfig.totalRounds) {
      await transitionToGameEnd(io, canvas.id, gameConfig.totalRounds);
      return;
    }

    await transitionToRoundStartWait(
      io,
      canvas.id,
      canvas.currentRoundNumber + 1,
    );
    return;
  }

  const roundEndsAt = new Date(
    activeRound.startedAt.getTime() + gameConfig.roundDurationSec * 1000,
  );

  if (roundEndsAt.getTime() <= Date.now()) {
    console.log(
      `[game-timer] active round already expired, ending immediately (canvasId=${canvas.id}, roundId=${activeRound.id})`,
    );

    startRoundBroadcast(io, canvas.id, activeRound);
    clearBroadcastInterval(canvas.id);

    try {
      await roundService.endRound(canvas.id, activeRound.id, io);
    } catch (error) {
      console.error(
        `[game-timer] failed to end expired round during resume (canvasId=${canvas.id}, roundId=${activeRound.id}):`,
        error,
      );
      return;
    }

    scheduleTimer(
      canvas.id,
      () => {
        void (async () => {
          try {
            await transitionAfterRoundResult(
              io,
              canvas.id,
              activeRound.roundNumber,
            );
          } catch (error) {
            console.error(
              `[game-timer] failed to transition after expired round resume (canvasId=${canvas.id}, round=${activeRound.roundNumber}):`,
              error,
            );
            clearScheduledTimer(canvas.id);
          }
        })();
      },
      gameConfig.roundResultDelaySec * 1000,
    );
    return;
  }

  scheduleRoundCompletion(io, canvas.id, activeRound, roundEndsAt);
}
async function resumeRoundResult(io: Server, canvas: Canvas): Promise<void> {
  const roundNumber = canvas.currentRoundNumber;
  const resultEndsAt = canvas.phaseEndsAt;

  if (!resultEndsAt) {
    try {
      await transitionAfterRoundResult(io, canvas.id, roundNumber);
    } catch (error) {
      console.error(
        `[game-timer] failed to resume round result without phase end (canvasId=${canvas.id}, round=${roundNumber}):`,
        error,
      );
    }
    return;
  }

  const remainingResultDelayMs = resultEndsAt.getTime() - Date.now();

  if (remainingResultDelayMs > 0) {
    scheduleTimer(
      canvas.id,
      () => {
        void (async () => {
          try {
            await transitionAfterRoundResult(io, canvas.id, roundNumber);
          } catch (error) {
            console.error(
              `[game-timer] failed to resume scheduled round result (canvasId=${canvas.id}, round=${roundNumber}):`,
              error,
            );
            clearScheduledTimer(canvas.id);
          }
        })();
      },
      remainingResultDelayMs,
    );
    return;
  }

  if (roundNumber >= gameConfig.totalRounds) {
    await resumeGameEndFromBoundary(io, canvas.id, roundNumber, resultEndsAt);
    return;
  }

  await resumeRoundStartWaitFromBoundary(
    io,
    canvas.id,
    roundNumber + 1,
    resultEndsAt,
  );
}

async function resumeGameEnd(io: Server, canvas: Canvas): Promise<void> {
  const roundNumber = canvas.currentRoundNumber || gameConfig.totalRounds;

  if (!canvas.phaseEndsAt) {
    io.to(`canvas:${canvas.id}`).emit("game:ended", { canvasId: canvas.id });

    try {
      await createNextCanvas(io);
    } catch (error) {
      console.error(
        `[game-timer] failed to create next canvas during immediate game-end resume (previousCanvasId=${canvas.id}):`,
        error,
      );
    }
    return;
  }

  if (canvas.phaseEndsAt.getTime() <= Date.now()) {
    io.to(`canvas:${canvas.id}`).emit("game:ended", { canvasId: canvas.id });

    try {
      await createNextCanvas(io);
    } catch (error) {
      console.error(
        `[game-timer] failed to create next canvas after elapsed game-end resume (previousCanvasId=${canvas.id}):`,
        error,
      );
    }
    return;
  }

  scheduleGameEnd(io, canvas.id, roundNumber, canvas.phaseEndsAt);
}

async function resumeCanvasPhase(io: Server, canvas: Canvas): Promise<void> {
  clearCanvasTimers(canvas.id);

  switch (canvas.phase) {
    case GamePhase.ROUND_START_WAIT: {
      const delayMs = Math.max(
        0,
        (canvas.phaseEndsAt?.getTime() ?? Date.now()) - Date.now(),
      );

      scheduleTimer(
        canvas.id,
        () => {
          void runRound(
            io,
            canvas.id,
            canvas.currentRoundNumber > 0 ? canvas.currentRoundNumber : 1,
          );
        },
        delayMs,
      );
      return;
    }

    case GamePhase.ROUND_ACTIVE:
      await resumeRoundActive(io, canvas);
      return;

    case GamePhase.ROUND_RESULT:
      await resumeRoundResult(io, canvas);
      return;

    case GamePhase.GAME_END:
      await resumeGameEnd(io, canvas);
      return;

    default:
      console.warn(
        `[game-timer] unsupported phase during resume (canvasId=${canvas.id}, phase=${canvas.phase})`,
      );
  }
}

export async function startGameTimer(
  io: Server,
  canvasId: number,
): Promise<void> {
  const canvas = await canvasRepository.findOne({
    where: { id: canvasId },
  });

  if (!canvas) {
    throw new Error(`Canvas was not found. (id=${canvasId})`);
  }

  await resumeCanvasPhase(io, canvas);
}

export function stopGameTimer(canvasId: number): void {
  clearCanvasTimers(canvasId);

  console.log(`[game-timer] stopped for canvasId=${canvasId}`);
}
