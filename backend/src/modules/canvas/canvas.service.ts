import { Server } from "socket.io";
import { createCanvasGameConfig } from "../../config/game.config";
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
import { pickRandomBackgroundTemplate } from "./template/background-template.service";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);

const DEFAULT_CHUNK_SIZE = 64;

interface CreateCanvasOptions {
  profileKey?: string | null;
}

interface GetChunkCellsParams {
  canvasId: number;
  startChunkX: number;
  endChunkX: number;
  startChunkY: number;
  endChunkY: number;
  chunkSize?: number;
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
    `[phase] ${reason} | 캔버스=${canvasId} 단계=${phase} 라운드=${roundNumber} 시작=${phaseStartedAt.toISOString()} 종료=${phaseEndsAt?.toISOString() ?? "null"}`,
  );
}

export const canvasService = {
  async create(io: Server, options: CreateCanvasOptions = {}): Promise<Canvas> {
    const existing = await canvasRepository.findOne({
      where: { status: CanvasStatus.PLAYING },
    });

    if (existing) {
      throw new Error("A canvas is already in progress.");
    }

    const { profileKey, snapshot } = createCanvasGameConfig(options.profileKey);

    const gridSizeX = snapshot.board.gridSizeX;
    const gridSizeY = snapshot.board.gridSizeY;

    const now = new Date();
    const phaseEndsAt = new Date(
      now.getTime() + snapshot.phases.introPhaseSec * 1000,
    );

    const backgroundTemplate = pickRandomBackgroundTemplate(
      gridSizeX,
      gridSizeY,
    );

    const canvas = canvasRepository.create({
      gridX: gridSizeX,
      gridY: gridSizeY,
      configProfileKey: profileKey,
      configSnapshot: snapshot,
      backgroundAssetKey: backgroundTemplate?.assetKey ?? null,
      status: CanvasStatus.PLAYING,
      phase: GamePhase.INTRO,
      phaseStartedAt: now,
      phaseEndsAt,
      currentRoundNumber: 1,
      startedAt: now,
    });

    await canvasRepository.save(canvas);

    logPhaseChange({
      canvasId: canvas.id,
      phase: GamePhase.INTRO,
      roundNumber: 1,
      phaseStartedAt: now,
      phaseEndsAt,
      reason: `캔버스 생성(profile=${profileKey})`,
    });

    await startGameTimer(io, canvas.id);

    return canvas;
  },

  async getCurrent(): Promise<Canvas | null> {
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

  async getChunkCells({
    canvasId,
    startChunkX,
    endChunkX,
    startChunkY,
    endChunkY,
    chunkSize = DEFAULT_CHUNK_SIZE,
  }: GetChunkCellsParams): Promise<{
    chunkSize: number;
    ranges: {
      startChunkX: number;
      endChunkX: number;
      startChunkY: number;
      endChunkY: number;
    };
    bounds: {
      minCellX: number;
      maxCellX: number;
      minCellY: number;
      maxCellY: number;
    };
    cells: Cell[];
  }> {
    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new Error("Canvas was not found.");
    }

    if (
      startChunkX < 0 ||
      endChunkX < startChunkX ||
      startChunkY < 0 ||
      endChunkY < startChunkY ||
      chunkSize <= 0
    ) {
      throw new Error("잘못된 chunk 범위입니다.");
    }

    const minCellX = startChunkX * chunkSize;
    const maxCellX = Math.min(
      canvas.gridX - 1,
      (endChunkX + 1) * chunkSize - 1,
    );
    const minCellY = startChunkY * chunkSize;
    const maxCellY = Math.min(
      canvas.gridY - 1,
      (endChunkY + 1) * chunkSize - 1,
    );

    const cells =
      minCellX > maxCellX || minCellY > maxCellY
        ? []
        : await cellRepository
            .createQueryBuilder("cell")
            .where("cell.canvas_id = :canvasId", { canvasId })
            .andWhere("cell.status = :status", { status: CellStatus.PAINTED })
            .andWhere("cell.x BETWEEN :minCellX AND :maxCellX", {
              minCellX,
              maxCellX,
            })
            .andWhere("cell.y BETWEEN :minCellY AND :maxCellY", {
              minCellY,
              maxCellY,
            })
            .orderBy("cell.y", "ASC")
            .addOrderBy("cell.x", "ASC")
            .getMany();

    return {
      chunkSize,
      ranges: {
        startChunkX,
        endChunkX,
        startChunkY,
        endChunkY,
      },
      bounds: {
        minCellX,
        maxCellX,
        minCellY,
        maxCellY,
      },
      cells,
    };
  },
};
