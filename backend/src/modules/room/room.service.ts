import { randomBytes } from "node:crypto";
import type { Server } from "socket.io";
import { AppDataSource } from "../../database/data-source";
import { buildGameConfigSnapshot, type GameConfigUpdate } from "../../config/game.config";
import { Canvas } from "../../entities/canvas.entity";
import { Room, RoomStatus, RoomType } from "../../entities/room.entity";
import { Voter } from "../../entities/voter.entity";
import { buildCanvasCreationData, startCanvasGame } from "../canvas/canvas.service";
import { participantSessionService } from "../participant/participant-session.service";

const roomRepository = AppDataSource.getRepository(Room);

export interface CreateRoomInput {
  title: string;
  type: RoomType.PUBLIC | RoomType.PRIVATE;
  profileKey?: string | null;
  introPhaseSec: number;
  totalRounds: number;
  votesPerRound: number;
}

export interface RoomSessionContext {
  roomId: number;
  publicRoomNumber: number | null;
  canvasId: number;
  type: RoomType;
}

const FIXED_ROUND_START_WAIT_SEC = 5;
const FIXED_ROUND_DURATION_SEC = 60;
const FIXED_ROUND_RESULT_DELAY_SEC = 10;
const FIXED_GAME_END_WAIT_SEC = 60 * 10;
const MAX_INTRO_PHASE_SEC = 60 * 5;
const MAX_VOTES_PER_ROUND = 120;
const MAX_GAME_DURATION_SEC = 60 * 60;
const ROUND_CYCLE_SEC =
  FIXED_ROUND_START_WAIT_SEC +
  FIXED_ROUND_DURATION_SEC +
  FIXED_ROUND_RESULT_DELAY_SEC;
const MAX_ACTIVE_ROOMS_PER_OWNER = 2;

function normalizeTitle(title: string): string {
  return title.trim();
}

function validateCreateRoomInput(input: CreateRoomInput): void {
  if (!normalizeTitle(input.title)) {
    throw new Error("ROOM_TITLE_REQUIRED");
  }

  if (normalizeTitle(input.title).length > 100) {
    throw new Error("ROOM_TITLE_TOO_LONG");
  }

  if (input.type !== RoomType.PUBLIC && input.type !== RoomType.PRIVATE) {
    throw new Error("ROOM_TYPE_INVALID");
  }

  if (
    !Number.isInteger(input.introPhaseSec) ||
    input.introPhaseSec < 0 ||
    input.introPhaseSec > MAX_INTRO_PHASE_SEC ||
    input.introPhaseSec % 5 !== 0
  ) {
    throw new Error("ROOM_INTRO_PHASE_INVALID");
  }

  if (
    !Number.isInteger(input.votesPerRound) ||
    input.votesPerRound < 1 ||
    input.votesPerRound > MAX_VOTES_PER_ROUND
  ) {
    throw new Error("ROOM_VOTES_PER_ROUND_INVALID");
  }

  const maxRounds = Math.floor(
    (MAX_GAME_DURATION_SEC - input.introPhaseSec) / ROUND_CYCLE_SEC,
  );

  if (
    !Number.isInteger(input.totalRounds) ||
    input.totalRounds < 1 ||
    input.totalRounds > maxRounds
  ) {
    throw new Error("ROOM_TOTAL_ROUNDS_INVALID");
  }
}

function buildRoomConfigUpdate(input: CreateRoomInput): GameConfigUpdate {
  return {
    phases: {
      introPhaseSec: input.introPhaseSec,
      roundStartWaitSec: FIXED_ROUND_START_WAIT_SEC,
      roundDurationSec: FIXED_ROUND_DURATION_SEC,
      roundResultDelaySec: FIXED_ROUND_RESULT_DELAY_SEC,
      gameEndWaitSec: FIXED_GAME_END_WAIT_SEC,
    },
    rules: {
      totalRounds: input.totalRounds,
      votesPerRound: input.votesPerRound,
    },
  };
}

async function assertOwnerActiveRoomLimit(ownerId: number): Promise<void> {
  const activeCount = await roomRepository
    .createQueryBuilder("room")
    .where("room.owner_voter_id = :ownerId", { ownerId })
    .andWhere("room.type IN (:...types)", {
      types: [RoomType.PUBLIC, RoomType.PRIVATE],
    })
    .andWhere("room.status IN (:...statuses)", {
      statuses: [RoomStatus.ACTIVE, RoomStatus.GAME_END_WAIT],
    })
    .getCount();

  if (activeCount >= MAX_ACTIVE_ROOMS_PER_OWNER) {
    throw new Error("ROOM_ACTIVE_LIMIT_REACHED");
  }
}

async function getNextPublicRoomNumber(): Promise<number> {
  const row = await roomRepository
    .createQueryBuilder("room")
    .select("COALESCE(MAX(room.publicRoomNumber), 0)", "max")
    .getRawOne<{ max: string | number }>();

  return Number(row?.max ?? 0) + 1;
}

async function generateUniqueAccessCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const accessCode = randomBytes(6).toString("base64url").toUpperCase();
    const existing = await roomRepository.findOne({
      where: { accessCode },
      select: { id: true },
    });

    if (!existing) {
      return accessCode;
    }
  }

  throw new Error("ROOM_ACCESS_CODE_GENERATION_FAILED");
}

function buildRoomSessionContext(room: Room): RoomSessionContext {
  return {
    roomId: room.id,
    publicRoomNumber: room.publicRoomNumber,
    canvasId: room.canvas.id,
    type: room.type,
  };
}

export const roomService = {
  async create(
    io: Server,
    ownerId: number,
    input: CreateRoomInput,
  ): Promise<{
    room: Room;
    sessionContext: RoomSessionContext | null;
    accessCode: string | null;
  }> {
    validateCreateRoomInput(input);
    await assertOwnerActiveRoomLimit(ownerId);

    const config = buildGameConfigSnapshot(
      input.profileKey,
      buildRoomConfigUpdate(input),
    );
    const publicRoomNumber = await getNextPublicRoomNumber();
    const accessCode =
      input.type === RoomType.PRIVATE ? await generateUniqueAccessCode() : null;

    const room = await AppDataSource.transaction(async (manager) => {
      const canvasRepository = manager.getRepository(Canvas);
      const txRoomRepository = manager.getRepository(Room);

      const canvas = canvasRepository.create(
        buildCanvasCreationData({
          profileKey: config.profileKey,
          snapshot: config.snapshot,
        }),
      );
      await canvasRepository.save(canvas);

      const createdRoom = txRoomRepository.create({
        type: input.type,
        status: RoomStatus.ACTIVE,
        publicRoomNumber,
        title: normalizeTitle(input.title),
        owner: { id: ownerId } as Voter,
        accessCode,
        settingsSnapshot: {
          title: normalizeTitle(input.title),
          type: input.type,
          profileKey: config.profileKey,
          introPhaseSec: input.introPhaseSec,
          totalRounds: input.totalRounds,
          votesPerRound: input.votesPerRound,
          gameEndWaitSec: FIXED_GAME_END_WAIT_SEC,
        },
        canvas,
        expiresAt: null,
        terminationReason: null,
      });

      return txRoomRepository.save(createdRoom);
    });

    const createdRoom = await roomRepository.findOneOrFail({
      where: { id: room.id },
      relations: { canvas: true, owner: true },
    });

    await startCanvasGame(io, createdRoom.canvas.id);

    return {
      room: createdRoom,
      sessionContext:
        createdRoom.type === RoomType.PUBLIC
          ? buildRoomSessionContext(createdRoom)
          : null,
      accessCode,
    };
  },

  async list(): Promise<Room[]> {
    return roomRepository.find({
      where: [
        { type: RoomType.PUBLIC, status: RoomStatus.ACTIVE },
        { type: RoomType.PUBLIC, status: RoomStatus.GAME_END_WAIT },
        { type: RoomType.PRIVATE, status: RoomStatus.ACTIVE },
        { type: RoomType.PRIVATE, status: RoomStatus.GAME_END_WAIT },
      ],
      relations: { canvas: true },
      order: { publicRoomNumber: "DESC" },
    });
  },

  async getListWithParticipantCount() {
    const rooms = await this.list();
    const participantCounts = await Promise.all(
      rooms.map((room) =>
        participantSessionService.getParticipantCount(room.canvas.id),
      ),
    );

    return rooms.map((room, index) => ({
      room,
      participantCount: participantCounts[index] ?? 0,
    }));
  },

  async getParticipantCount(room: Room): Promise<number> {
    return participantSessionService.getParticipantCount(room.canvas.id);
  },

  async getParticipantList(room: Room) {
    return participantSessionService.getParticipantList(room.canvas.id);
  },

  async getPublicDetail(publicRoomNumber: number): Promise<Room> {
    const room = await roomRepository.findOne({
      where: {
        publicRoomNumber,
      },
      relations: { canvas: true, owner: true },
    });

    if (!room || room.status === RoomStatus.EXPIRED) {
      throw new Error("ROOM_NOT_FOUND");
    }

    return room;
  },

  async enterPublic(publicRoomNumber: number) {
    const room = await this.getPublicDetail(publicRoomNumber);

    return {
      room,
      sessionContext: buildRoomSessionContext(room),
    };
  },

  async enterPrivate(accessCode: string) {
    const room = await roomRepository.findOne({
      where: {
        accessCode,
        type: RoomType.PRIVATE,
      },
      relations: { canvas: true },
    });

    if (!room || room.status === RoomStatus.EXPIRED) {
      throw new Error("ROOM_EXPIRED");
    }

    return {
      room,
      sessionContext: buildRoomSessionContext(room),
    };
  },

  async getCurrent(roomId: number): Promise<Room> {
    const room = await roomRepository.findOne({
      where: { id: roomId },
      relations: { canvas: true },
    });

    if (!room || room.status === RoomStatus.EXPIRED) {
      throw new Error("ROOM_CONTEXT_NOT_FOUND");
    }

    return room;
  },

  async getCurrentManage(roomId: number, ownerId: number): Promise<Room> {
    const room = await roomRepository.findOne({
      where: {
        id: roomId,
        owner: { id: ownerId },
      },
      relations: { canvas: true, owner: true },
    });

    if (!room || room.type === RoomType.PLAZA) {
      throw new Error("ROOM_MANAGE_FORBIDDEN");
    }

    return room;
  },
};
