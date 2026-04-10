import { Server } from "socket.io";
import {
  getCanvasGameConfigSnapshot,
  type GameConfigSnapshot,
} from "../../config/game.config";
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

function getGameEndAt(
  config: GameConfigSnapshot,
  roundStartedAt: Date,
  currentRound: number,
): Date {
  const remainingRoundsIncludingCurrent =
    config.rules.totalRounds - currentRound + 1;

  return new Date(
    roundStartedAt.getTime() +
      remainingRoundsIncludingCurrent * config.phases.roundDurationSec * 1000 +
      Math.max(0, remainingRoundsIncludingCurrent - 1) *
        config.phases.roundResultDelaySec *
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

async function getCanvasOrThrow(canvasId: number): Promise<Canvas> {
  const canvas = await canvasRepository.findOne({
    where: { id: canvasId },
  });

  if (!canvas) {
    throw new Error(`Canvas was not found. (id=${canvasId})`);
  }

  return canvas;
}

async function createNextCanvas(
  io: Server,
  profileKey?: string | null,
): Promise<void> {
  const { canvasService } = await import("../canvas/canvas.service");
  await canvasService.create(io, { profileKey });
}

async function transitionToRoundStartWait(
  io: Server,
  canvasId: number,
  roundNumber: number,
): Promise<void> {
  const canvas = await getCanvasOrThrow(canvasId);
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

  const phaseStartedAt = new Date();
  const phaseEndsAt = new Date(
    phaseStartedAt.getTime() + canvasGameConfig.phases.roundStartWaitSec * 1000,
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
    canvasGameConfig.phases.roundStartWaitSec * 1000,
  );
}

async function transitionToGameEnd(
  io: Server,
  canvasId: number,
  roundNumber: number,
): Promise<void> {
  const canvas = await getCanvasOrThrow(canvasId);
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

  const phaseStartedAt = new Date();
  const phaseEndsAt = new Date(
    phaseStartedAt.getTime() + canvasGameConfig.phases.gameEndWaitSec * 1000,
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
          const finishedCanvas = await canvasRepository.findOne({
            where: { id: canvasId },
          });

          await createNextCanvas(io, finishedCanvas?.configProfileKey);
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
  canvas: Canvas,
  round: VoteRound,
): (
  remainingSecondsOverride?: number,
  isRoundExpiredOverride?: boolean,
) => void {
  clearBroadcastInterval(canvas.id);

  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);
  const gameEndAt = getGameEndAt(
    canvasGameConfig,
    round.startedAt,
    round.roundNumber,
  );

  const broadcastTimerUpdate = (
    remainingSecondsOverride?: number,
    isRoundExpiredOverride?: boolean,
  ) => {
    const elapsed = Math.floor((Date.now() - round.startedAt.getTime()) / 1000);

    const remainingSeconds =
      remainingSecondsOverride ??
      Math.max(0, canvasGameConfig.phases.roundDurationSec - elapsed);

    const isRoundExpired = isRoundExpiredOverride ?? remainingSeconds === 0;

    io.to(`canvas:${canvas.id}`).emit("timer:update", {
      roundId: round.id,
      roundNumber: round.roundNumber,
      remainingSeconds,
      isRoundExpired,
      roundDurationSec: canvasGameConfig.phases.roundDurationSec,
      totalRounds: canvasGameConfig.rules.totalRounds,
      gameEndAt: gameEndAt.toISOString(),
    });
  };

  broadcastTimerUpdate();

  const broadcastInterval = setInterval(() => {
    broadcastTimerUpdate();
  }, 1000);

  activeBroadcasts.set(canvas.id, broadcastInterval);

  return broadcastTimerUpdate;
}

function scheduleRoundCompletion(
  io: Server,
  canvas: Canvas,
  round: VoteRound,
  roundEndsAt: Date,
): void {
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);
  const broadcastTimerUpdate = startRoundBroadcast(io, canvas, round);
  const delayMs = Math.max(0, roundEndsAt.getTime() - Date.now());

  scheduleTimer(
    canvas.id,
    () => {
      void (async () => {
        clearBroadcastInterval(canvas.id);
        broadcastTimerUpdate(0, true);

        try {
          await roundService.endRound(canvas.id, round.id, io);
        } catch (err) {
          console.error(
            `[game-timer] failed to end round (canvasId=${canvas.id}, roundId=${round.id}):`,
            err,
          );
          clearScheduledTimer(canvas.id);
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
                  round.roundNumber,
                );
              } catch (error) {
                console.error(
                  `[game-timer] failed to transition after round result (canvasId=${canvas.id}, round=${round.roundNumber}):`,
                  error,
                );
                clearScheduledTimer(canvas.id);
              }
            })();
          },
          canvasGameConfig.phases.roundResultDelaySec * 1000,
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
  const canvas = await getCanvasOrThrow(canvasId);
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

  if (roundNumber >= canvasGameConfig.rules.totalRounds) {
    await transitionToGameEnd(io, canvasId, roundNumber);
    return;
  }

  await transitionToRoundStartWait(io, canvasId, roundNumber + 1);
}

async function resumeRoundStartWaitFromBoundary(
  io: Server,
  canvas: Canvas,
  nextRoundNumber: number,
  waitStartedAt: Date,
): Promise<void> {
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

  const waitEndsAt = new Date(
    waitStartedAt.getTime() + canvasGameConfig.phases.roundStartWaitSec * 1000,
  );

  await canvasRepository.update(canvas.id, {
    phase: GamePhase.ROUND_START_WAIT,
    phaseStartedAt: waitStartedAt,
    phaseEndsAt: waitEndsAt,
    currentRoundNumber: nextRoundNumber,
  });

  logPhaseChange({
    canvasId: canvas.id,
    phase: GamePhase.ROUND_START_WAIT,
    roundNumber: nextRoundNumber,
    phaseStartedAt: waitStartedAt,
    phaseEndsAt: waitEndsAt,
    reason: "round start wait resume",
  });

  const delayMs = Math.max(0, waitEndsAt.getTime() - Date.now());

  if (delayMs === 0) {
    await runRound(io, canvas.id, nextRoundNumber);
    return;
  }

  scheduleTimer(
    canvas.id,
    () => {
      void runRound(io, canvas.id, nextRoundNumber);
    },
    delayMs,
  );
}

async function resumeGameEndFromBoundary(
  io: Server,
  canvas: Canvas,
  roundNumber: number,
  gameEndStartedAt: Date,
): Promise<void> {
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

  const gameEndEndsAt = new Date(
    gameEndStartedAt.getTime() + canvasGameConfig.phases.gameEndWaitSec * 1000,
  );

  await canvasRepository.update(canvas.id, {
    status: CanvasStatus.FINISHED,
    phase: GamePhase.GAME_END,
    phaseStartedAt: gameEndStartedAt,
    phaseEndsAt: gameEndEndsAt,
    currentRoundNumber: roundNumber,
    endedAt: gameEndStartedAt,
  });

  logPhaseChange({
    canvasId: canvas.id,
    phase: GamePhase.GAME_END,
    roundNumber,
    phaseStartedAt: gameEndStartedAt,
    phaseEndsAt: gameEndEndsAt,
    reason: "game end resume",
  });

  if (gameEndEndsAt.getTime() <= Date.now()) {
    io.to(`canvas:${canvas.id}`).emit("game:ended", { canvasId: canvas.id });

    try {
      await createNextCanvas(io, canvas.configProfileKey);
    } catch (error) {
      console.error(
        `[game-timer] failed to create next canvas after elapsed game-end resume (previousCanvasId=${canvas.id}):`,
        error,
      );
    }
    return;
  }

  scheduleGameEnd(io, canvas.id, roundNumber, gameEndEndsAt);
}

async function runRound(
  io: Server,
  canvasId: number,
  expectedRoundNumber: number,
): Promise<void> {
  const canvas = await getCanvasOrThrow(canvasId);
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

  if (expectedRoundNumber > canvasGameConfig.rules.totalRounds) {
    await transitionToGameEnd(io, canvasId, canvasGameConfig.rules.totalRounds);
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
    round.startedAt.getTime() + canvasGameConfig.phases.roundDurationSec * 1000,
  );

  scheduleRoundCompletion(io, canvas, round, roundEndsAt);
}

async function resumeRoundActive(io: Server, canvas: Canvas): Promise<void> {
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

  const activeRound = await roundRepository.findOne({
    where: { canvas: { id: canvas.id }, isActive: true },
    order: { roundNumber: "DESC" },
  });

  if (!activeRound) {
    console.warn(
      `[game-timer] active phase without active round detected (canvasId=${canvas.id})`,
    );

    if (canvas.currentRoundNumber >= canvasGameConfig.rules.totalRounds) {
      await transitionToGameEnd(
        io,
        canvas.id,
        canvasGameConfig.rules.totalRounds,
      );
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
    activeRound.startedAt.getTime() +
      canvasGameConfig.phases.roundDurationSec * 1000,
  );

  if (roundEndsAt.getTime() <= Date.now()) {
    console.log(
      `[game-timer] active round already expired, ending immediately (canvasId=${canvas.id}, roundId=${activeRound.id})`,
    );

    startRoundBroadcast(io, canvas, activeRound);
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
      canvasGameConfig.phases.roundResultDelaySec * 1000,
    );
    return;
  }

  scheduleRoundCompletion(io, canvas, activeRound, roundEndsAt);
}

async function resumeRoundResult(io: Server, canvas: Canvas): Promise<void> {
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);
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

  if (roundNumber >= canvasGameConfig.rules.totalRounds) {
    await resumeGameEndFromBoundary(io, canvas, roundNumber, resultEndsAt);
    return;
  }

  await resumeRoundStartWaitFromBoundary(
    io,
    canvas,
    roundNumber + 1,
    resultEndsAt,
  );
}

async function resumeGameEnd(io: Server, canvas: Canvas): Promise<void> {
  const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);
  const roundNumber =
    canvas.currentRoundNumber || canvasGameConfig.rules.totalRounds;

  if (!canvas.phaseEndsAt) {
    io.to(`canvas:${canvas.id}`).emit("game:ended", { canvasId: canvas.id });

    try {
      await createNextCanvas(io, canvas.configProfileKey);
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
      await createNextCanvas(io, canvas.configProfileKey);
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
