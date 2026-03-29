import { Server } from "socket.io";
import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import { roundService } from "../round/round.service";
import { gameConfig } from "../../config/game.config";

// canvasId별 라운드 종료 타이머 핸들 관리
const activeTimers = new Map<number, NodeJS.Timeout>();

// canvasId별 timer:update broadcast interval 관리
const activeBroadcasts = new Map<number, NodeJS.Timeout>();

// 라운드 종료 후 다음 라운드 시작 전 마감 상태 유지 시간(초)
const ROUND_RESULT_DELAY_SEC = 10;

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

export async function startGameTimer(
  io: Server,
  canvasId: number,
): Promise<void> {
  if (activeTimers.has(canvasId)) {
    console.log(`[타이머] canvasId=${canvasId} 이미 실행 중`);
    return;
  }

  const canvasRepository = AppDataSource.getRepository(Canvas);
  const canvas = await canvasRepository.findOne({ where: { id: canvasId } });
  if (!canvas) {
    throw new Error(`캔버스를 찾을 수 없습니다. (id=${canvasId})`);
  }

  async function runRound(currentRound: number): Promise<void> {
    if (currentRound > gameConfig.totalRounds) {
      await endGame(io, canvasId);
      return;
    }

    let round;
    try {
      round = await roundService.startRound(canvasId, io);
    } catch (err) {
      console.error(`[타이머] 라운드 시작 실패 (canvasId=${canvasId}):`, err);
      activeTimers.delete(canvasId);
      return;
    }

    console.log(
      `[타이머] 라운드 ${round.roundNumber} 시작 (canvasId=${canvasId})`,
    );

    const gameEndAt = getGameEndAt(round.startedAt, round.roundNumber);

    const broadcastTimerUpdate = (
      remainingSecondsOverride?: number,
      isRoundExpiredOverride?: boolean,
    ) => {
      const elapsed = Math.floor(
        (Date.now() - round.startedAt.getTime()) / 1000,
      );

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

    const timer = setTimeout(async () => {
      const runningBroadcast = activeBroadcasts.get(canvasId);
      if (runningBroadcast) {
        clearInterval(runningBroadcast);
        activeBroadcasts.delete(canvasId);
      }

      // 라운드 종료 직후 마감 상태를 즉시 1회 전송
      broadcastTimerUpdate(0, true);

      try {
        await roundService.endRound(canvasId, round.id, io);
      } catch (err) {
        console.error(
          `[타이머] 라운드 종료 실패 (canvasId=${canvasId}, roundId=${round.id}):`,
          err,
        );
        activeTimers.delete(canvasId);
        return;
      }

      console.log(
        `[타이머] 라운드 ${round.roundNumber} 종료 (canvasId=${canvasId})`,
      );

      const delayTimer = setTimeout(() => {
        activeTimers.delete(canvasId);
        runRound(currentRound + 1);
      }, gameConfig.roundResultDelaySec * 1000);

      activeTimers.set(canvasId, delayTimer);
    }, gameConfig.roundDurationSec * 1000);

    activeTimers.set(canvasId, timer);
  }

  runRound(1);
}

export function stopGameTimer(canvasId: number): void {
  const timer = activeTimers.get(canvasId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(canvasId);
  }

  const broadcastInterval = activeBroadcasts.get(canvasId);
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    activeBroadcasts.delete(canvasId);
  }

  console.log(`[타이머] canvasId=${canvasId} 타이머 중지`);
}

async function endGame(io: Server, canvasId: number): Promise<void> {
  const canvasRepository = AppDataSource.getRepository(Canvas);

  await canvasRepository.update(canvasId, {
    status: CanvasStatus.FINISHED,
    endedAt: new Date(),
  });

  activeTimers.delete(canvasId);

  const broadcastInterval = activeBroadcasts.get(canvasId);
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    activeBroadcasts.delete(canvasId);
  }

  console.log(`[타이머] 게임 종료 (canvasId=${canvasId})`);

  io.to(`canvas:${canvasId}`).emit("game:ended", { canvasId });
}
