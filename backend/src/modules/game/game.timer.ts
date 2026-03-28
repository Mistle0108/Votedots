import { Server } from "socket.io";
import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import { roundService } from "../round/round.service";
import { gameConfig } from "../../config/game.config";


// canvasId별 타이머 핸들 관리 (중복 방지)
const activeTimers = new Map<number, NodeJS.Timeout>();

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
    throw new Error(`캔버스를 찾을 수 없어요 (id=${canvasId})`);
  }

  async function runRound(currentRound: number): Promise<void> {
    // 총 라운드 수 초과 → 게임 종료
    if (currentRound > gameConfig.totalRounds) {
      await endGame(io, canvasId);
      return;
    }

    // 라운드 시작 (round:started 브로드캐스트는 roundService 내부에서 처리)
    let round;
    try {
      round = await roundService.startRound(canvasId, io);
    } catch (err) {
      console.error(`[타이머] 라운드 시작 실패 (canvasId=${canvasId}):`, err);
      activeTimers.delete(canvasId);
      return;
    }

    console.log(`[타이머] 라운드 ${round.roundNumber} 시작 (canvasId=${canvasId})`);

    // roundDurationSec 후 자동 종료
    const timer = setTimeout(async () => {
      activeTimers.delete(canvasId);

      // 라운드 종료 (round:ended + canvas:updated 브로드캐스트는 roundService 내부에서 처리)
      try {
        await roundService.endRound(canvasId, round.id, io);
      } catch (err) {
        console.error(
          `[타이머] 라운드 종료 실패 (canvasId=${canvasId}, roundId=${round.id}):`,
          err,
        );
        return;
      }

      console.log(`[타이머] 라운드 ${round.roundNumber} 종료 (canvasId=${canvasId})`);

      // 다음 라운드 시작
      runRound(currentRound + 1);
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
    console.log(`[타이머] canvasId=${canvasId} 타이머 중지`);
  }
}

async function endGame(io: Server, canvasId: number): Promise<void> {
  const canvasRepository = AppDataSource.getRepository(Canvas);
  await canvasRepository.update(canvasId, {
    status: CanvasStatus.FINISHED,
    endedAt: new Date(),
  });

  activeTimers.delete(canvasId);
  console.log(`[타이머] 게임 종료 (canvasId=${canvasId})`);

  io.to(`canvas:${canvasId}`).emit("game:ended", { canvasId });
}