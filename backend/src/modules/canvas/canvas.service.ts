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

interface CreateCanvasOptions {
  profileKey?: string | null;
}

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

    const cells: Array<{
      canvas: { id: number };
      x: number;
      y: number;
      color: string | null;
      status: CellStatus;
    }> = [];

    for (let y = 0; y < gridSizeY; y++) {
      for (let x = 0; x < gridSizeX; x++) {
        cells.push({
          canvas: { id: canvas.id },
          x,
          y,
          color: null,
          status: CellStatus.IDLE,
        });
      }
    }

    for (let index = 0; index < cells.length; index += CELL_INSERT_CHUNK_SIZE) {
      const chunk = cells.slice(index, index + CELL_INSERT_CHUNK_SIZE);
      await cellRepository.insert(chunk);
    }

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
