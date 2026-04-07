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

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);

const GRID_X = parseInt(process.env.GRID_SIZE_X ?? "25", 10);
const GRID_Y = parseInt(process.env.GRID_SIZE_Y ?? "25", 10);

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

    const cells: Partial<Cell>[] = [];
    for (let y = 0; y < GRID_Y; y++) {
      for (let x = 0; x < GRID_X; x++) {
        cells.push({
          canvas,
          x,
          y,
          color: null,
          status: CellStatus.IDLE,
        });
      }
    }

    await cellRepository.save(cells as Cell[]);
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
};
