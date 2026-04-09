import { Server } from "socket.io";
import { gameConfig } from "../../config/game.config";
import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import { Cell, CellStatus } from "../../entities/cell.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { GamePhase } from "../game/game-phase.types";
import { startGameTimer } from "../game/game.timer";
import {
  participantSessionService,
  type ParticipantSummary,
} from "../participant/participant-session.service";
import { InsertResult } from "typeorm";


const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);

const GRID_X = parseInt(process.env.GRID_SIZE_X ?? "25", 10);
const GRID_Y = parseInt(process.env.GRID_SIZE_Y ?? "25", 10);
const CELL_INSERT_CHUNK_SIZE = 1000;

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
    `[phase] ${reason} | 캔버스=${canvasId} 단계=${phase} 라운드=${roundNumber} 시작=${phaseStartedAt.toISOString()} 종료=${phaseEndsAt?.toISOString() ?? "null"}`,
  );
}

export const canvasService = {
  async create(io: Server): Promise<Canvas> {
    const existing = await canvasRepository.findOne({
      where: { status: CanvasStatus.PLAYING },
    });

    if (existing) {
      throw new Error("A canvas is already in progress.");
    }

    const now = new Date();
    const phaseEndsAt = new Date(
      now.getTime() + gameConfig.roundStartWaitSec * 1000,
    );

    const canvas = canvasRepository.create({
      gridX: GRID_X,
      gridY: GRID_Y,
      status: CanvasStatus.PLAYING,
      phase: GamePhase.ROUND_START_WAIT,
      phaseStartedAt: now,
      phaseEndsAt,
      currentRoundNumber: 1,
      startedAt: now,
    });

    await canvasRepository.save(canvas);

    logPhaseChange({
      canvasId: canvas.id,
      phase: GamePhase.ROUND_START_WAIT,
      roundNumber: 1,
      phaseStartedAt: now,
      phaseEndsAt,
      reason: "캔버스 생성",
    });

    const cells: Array<{
      canvas: { id: number };
      x: number;
      y: number;
      color: null;
      status: CellStatus;
    }> = [];

    for (let y = 0; y < GRID_Y; y++) {
      for (let x = 0; x < GRID_X; x++) {
        cells.push({
          canvas: { id: canvas.id },
          x,
          y,
          color: null,
          status: CellStatus.IDLE,
        });
      }
    }

    // 여기서 시작
    const cellInsertStartedAt = performance.now();

    for (let index = 0; index < cells.length; index += CELL_INSERT_CHUNK_SIZE) {
      const chunk = cells.slice(index, index + CELL_INSERT_CHUNK_SIZE);
      await cellRepository.insert(chunk);
    }

    // 여기서 종료 로그
    console.log(
      `[perf] canvas cells insert | canvasId=${canvas.id} count=${cells.length} ms=${(performance.now() - cellInsertStartedAt).toFixed(2)}`,
    );

    await startGameTimer(io, canvas.id);

    return canvas;
  },

  async getCurrent(): Promise<Canvas | null> {
    return canvasRepository.findOne({
      where: { status: CanvasStatus.PLAYING },
    });
  },

  async getCells(canvasId: number): Promise<Cell[]> {
    return cellRepository.find({
      where: { canvas: { id: canvasId } },
      order: { y: "ASC", x: "ASC" },
    });
  },

  async getCurrentParticipantCount(): Promise<{
    canvasId: number;
    count: number;
  }> {
    const canvas = await this.getCurrent();

    if (!canvas) {
      throw new Error("No canvas is currently in progress.");
    }

    const count = await participantSessionService.getParticipantCount(
      canvas.id,
    );

    return {
      canvasId: canvas.id,
      count,
    };
  },

  async getCurrentParticipantList(): Promise<{
    canvasId: number;
    participants: ParticipantSummary[];
  }> {
    const canvas = await this.getCurrent();

    if (!canvas) {
      throw new Error("No canvas is currently in progress.");
    }

    const participants = await participantSessionService.getParticipantList(
      canvas.id,
    );

    return {
      canvasId: canvas.id,
      participants,
    };
  },

  async recoverOnStartup(io: Server): Promise<Canvas> {
    const now = new Date();

    const playingCanvases = await canvasRepository.find({
      where: { status: CanvasStatus.PLAYING },
      order: { startedAt: "DESC" },
    });

    if (playingCanvases.length > 0) {
      const canvasIds = playingCanvases.map((canvas) => canvas.id);

      await canvasRepository.update(
        { status: CanvasStatus.PLAYING },
        {
          status: CanvasStatus.FINISHED,
          phase: GamePhase.GAME_END,
          phaseStartedAt: now,
          phaseEndsAt: now,
          endedAt: now,
        },
      );

      for (const canvasId of canvasIds) {
        logPhaseChange({
          canvasId,
          phase: GamePhase.GAME_END,
          roundNumber: 0,
          phaseStartedAt: now,
          phaseEndsAt: now,
          reason: "서버 복구 중 이전 캔버스 종료 처리",
        });

        await voteRoundRepository.update(
          { canvas: { id: canvasId }, isActive: true },
          {
            isActive: false,
            endedAt: now,
          },
        );
      }
    }

    return this.create(io);
  },
  async getCanvasToResumeAfterReconnect(): Promise<Canvas | null> {
    const currentCanvas = await canvasRepository.findOne({
      where: { status: CanvasStatus.PLAYING },
      order: { startedAt: "DESC" },
    });

    if (currentCanvas) {
      return currentCanvas;
    }

    return canvasRepository.findOne({
      where: {
        status: CanvasStatus.FINISHED,
        phase: GamePhase.GAME_END,
      },
      order: { phaseStartedAt: "DESC" },
    });
  },
};
