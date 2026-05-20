import { randomBytes } from "node:crypto";
import type { Server } from "socket.io";
import { AppDataSource } from "../../database/data-source";
import {
  buildGameConfigSnapshot,
  getGameConfigSnapshot,
  type GameConfigUpdate,
} from "../../config/game.config";
import { Canvas } from "../../entities/canvas.entity";
import {
  Room,
  RoomStatus,
  RoomTerminationReason,
  RoomType,
} from "../../entities/room.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { Voter } from "../../entities/voter.entity";
import { buildCanvasCreationData, startCanvasGame } from "../canvas/canvas.service";
import { GamePhase } from "../game/game-phase.types";
import { participantSessionService } from "../participant/participant-session.service";

const roomRepository = AppDataSource.getRepository(Room);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);

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
  canvasId: number;
  type: RoomType;
}

const MAX_INTRO_PHASE_SEC = 60 * 5;
const MAX_VOTES_PER_ROUND = 120;
const MAX_GAME_DURATION_SEC = 60 * 60;
const MAX_ACTIVE_ROOMS_PER_OWNER = 3;
const MAX_ROOM_TITLE_LENGTH = 30;

async function expireElapsedRooms(): Promise<void> {
  const rooms = await roomRepository.find({
    where: [
      {
        type: RoomType.PUBLIC,
        status: RoomStatus.GAME_END_WAIT,
      },
      {
        type: RoomType.PRIVATE,
        status: RoomStatus.GAME_END_WAIT,
      },
    ],
    relations: { canvas: true },
  });

  const now = Date.now();

  await Promise.all(
    rooms
      .filter((room) => room.expiresAt && room.expiresAt.getTime() <= now)
      .map(async (room) => {
        room.status = RoomStatus.EXPIRED;
        room.terminationReason =
          room.terminationReason ?? RoomTerminationReason.EXPIRED;
        await roomRepository.save(room);
      }),
  );
}

async function reconcileRoomLifecycle(room: Room): Promise<Room> {
  if (room.type === RoomType.PLAZA || room.status === RoomStatus.EXPIRED) {
    return room;
  }

  const now = Date.now();
  const phaseEndsAt = room.canvas.phaseEndsAt;

  if (
    room.canvas.phase === GamePhase.GAME_END &&
    phaseEndsAt &&
    phaseEndsAt.getTime() <= now
  ) {
    room.status = RoomStatus.EXPIRED;
    room.terminationReason =
      room.terminationReason ?? RoomTerminationReason.EXPIRED;
    room.expiresAt = room.expiresAt ?? phaseEndsAt;
    return roomRepository.save(room);
  }

  if (
    room.canvas.phase === GamePhase.GAME_END &&
    phaseEndsAt &&
    room.status !== RoomStatus.GAME_END_WAIT
  ) {
    room.status = RoomStatus.GAME_END_WAIT;
    room.expiresAt = phaseEndsAt;
    room.terminationReason = room.terminationReason ?? null;
    return roomRepository.save(room);
  }

  return room;
}

function normalizeTitle(title: string): string {
  return title.trim();
}

function validateCreateRoomInput(
  input: CreateRoomInput,
  profileSnapshot: ReturnType<typeof getGameConfigSnapshot>,
): void {
  if (!normalizeTitle(input.title)) {
    throw new Error("ROOM_TITLE_REQUIRED");
  }

  if (normalizeTitle(input.title).length > MAX_ROOM_TITLE_LENGTH) {
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

  const roundCycleSec =
    profileSnapshot.phases.roundStartWaitSec +
    profileSnapshot.phases.roundDurationSec +
    profileSnapshot.phases.roundResultDelaySec;
  const maxRounds = Math.floor(
    (MAX_GAME_DURATION_SEC - input.introPhaseSec) / roundCycleSec,
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
    canvasId: room.canvas.id,
    type: room.type,
  };
}

export const roomService = {
  async markGameEndWaitByCanvas(
    canvasId: number,
    expiresAt: Date,
    terminationReason: RoomTerminationReason | null = null,
  ): Promise<void> {
    const room = await roomRepository.findOne({
      where: { canvas: { id: canvasId } },
      relations: { canvas: true },
    });

    if (!room || room.type === RoomType.PLAZA) {
      return;
    }

    await roomRepository.update(room.id, {
      status: RoomStatus.GAME_END_WAIT,
      expiresAt,
      terminationReason,
    });
  },

  async expireAfterGameEndByCanvas(canvasId: number): Promise<Room | null> {
    const room = await roomRepository.findOne({
      where: { canvas: { id: canvasId } },
      relations: { canvas: true },
    });

    if (!room || room.type === RoomType.PLAZA) {
      return null;
    }

    if (room.status === RoomStatus.EXPIRED) {
      return room;
    }

    room.status = RoomStatus.EXPIRED;
    room.terminationReason =
      room.terminationReason ?? RoomTerminationReason.EXPIRED;
    room.expiresAt = room.expiresAt ?? new Date();

    return roomRepository.save(room);
  },

  async create(
    io: Server,
    ownerId: number,
    input: CreateRoomInput,
  ): Promise<{
    room: Room;
    sessionContext: RoomSessionContext | null;
    accessCode: string;
  }> {
    const profileSnapshot = getGameConfigSnapshot(input.profileKey);
    validateCreateRoomInput(input, profileSnapshot);
    await assertOwnerActiveRoomLimit(ownerId);

    const config = buildGameConfigSnapshot(
      input.profileKey,
      buildRoomConfigUpdate(input),
    );
    const accessCode = await generateUniqueAccessCode();

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
        publicRoomNumber: null,
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
          gameEndWaitSec: config.snapshot.phases.gameEndWaitSec,
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
    await expireElapsedRooms();

    const rooms = await roomRepository.find({
      where: [
        { type: RoomType.PUBLIC, status: RoomStatus.ACTIVE },
        { type: RoomType.PUBLIC, status: RoomStatus.GAME_END_WAIT },
        { type: RoomType.PRIVATE, status: RoomStatus.ACTIVE },
        { type: RoomType.PRIVATE, status: RoomStatus.GAME_END_WAIT },
      ],
      relations: { canvas: true, owner: true },
      order: { id: "DESC" },
    });

    const reconciledRooms = await Promise.all(rooms.map(reconcileRoomLifecycle));
    return reconciledRooms.filter((room) => room.status !== RoomStatus.EXPIRED);
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

  async getDetailByRoomId(roomId: number): Promise<Room> {
    await expireElapsedRooms();

    const foundRoom = await roomRepository.findOne({
      where: {
        id: roomId,
      },
      relations: { canvas: true, owner: true },
    });

    const room = foundRoom ? await reconcileRoomLifecycle(foundRoom) : null;

    if (!room || room.status === RoomStatus.EXPIRED) {
      throw new Error("ROOM_NOT_FOUND");
    }

    return room;
  },

  async enterByAccessCode(accessCode: string) {
    await expireElapsedRooms();

    const foundRoom = await roomRepository.findOne({
      where: {
        accessCode,
      },
      relations: { canvas: true },
    });

    if (!foundRoom) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const room = await reconcileRoomLifecycle(foundRoom);

    if (room.status === RoomStatus.EXPIRED) {
      throw new Error("ROOM_EXPIRED");
    }

    return {
      room,
      sessionContext: buildRoomSessionContext(room),
    };
  },

  async enterPublicByRoomId(roomId: number) {
    const room = await this.getDetailByRoomId(roomId);

    if (room.type !== RoomType.PUBLIC) {
      throw new Error("ROOM_TYPE_INVALID");
    }

    return {
      room,
      sessionContext: buildRoomSessionContext(room),
    };
  },

  async getCurrent(roomId: number): Promise<Room> {
    await expireElapsedRooms();

    const foundRoom = await roomRepository.findOne({
      where: { id: roomId },
      relations: { canvas: true },
    });

    const room = foundRoom ? await reconcileRoomLifecycle(foundRoom) : null;

    if (!room || room.status === RoomStatus.EXPIRED) {
      throw new Error("ROOM_CONTEXT_NOT_FOUND");
    }

    return room;
  },

  async getCurrentManage(roomId: number, ownerId: number): Promise<Room> {
    await expireElapsedRooms();

    const foundRoom = await roomRepository.findOne({
      where: {
        id: roomId,
        owner: { id: ownerId },
      },
      relations: { canvas: true, owner: true },
    });

    const room = foundRoom ? await reconcileRoomLifecycle(foundRoom) : null;

    if (!room || room.type === RoomType.PLAZA) {
      throw new Error("ROOM_MANAGE_FORBIDDEN");
    }

    return room;
  },

  async getActiveRound(canvasId: number): Promise<VoteRound | null> {
    return voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
    });
  },

  async expireByOwner(roomId: number): Promise<Room> {
    const room = await roomRepository.findOneOrFail({
      where: { id: roomId },
      relations: { canvas: true },
    });

    room.status = RoomStatus.EXPIRED;
    room.terminationReason = RoomTerminationReason.TERMINATED_BY_OWNER;
    room.expiresAt = new Date();

    return roomRepository.save(room);
  },
};
