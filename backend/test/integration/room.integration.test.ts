import { AppDataSource } from "../../src/database/data-source";
import { Canvas } from "../../src/entities/canvas.entity";
import { Room, RoomType } from "../../src/entities/room.entity";
import { Voter, VoterRole } from "../../src/entities/voter.entity";
import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

const canvasRepository = AppDataSource.getRepository(Canvas);
const roomRepository = AppDataSource.getRepository(Room);
const voterRepository = AppDataSource.getRepository(Voter);

async function createRoomFixture(params: {
  title: string;
  type: RoomType.PUBLIC | RoomType.PRIVATE;
  accessCode: string;
}) {
  const owner = await voterRepository.save(
    voterRepository.create({
      username: `owner-${params.accessCode.toLowerCase()}`,
      password: "hashed-password",
      nickname: "Owner01",
      isGuest: false,
      termsAcceptedAt: new Date(),
      termsAcceptedLocale: "en",
      termsVersion: "2026-05-12",
      isAge14OrOlderConfirmed: true,
      isWithdrawn: false,
      withdrawnAt: null,
      role: VoterRole.USER,
      createdBy: null,
      updatedBy: null,
    }),
  );

  const canvas = await canvasRepository.save(
    canvasRepository.create({
      gridX: 32,
      gridY: 32,
      createdBy: null,
      updatedBy: null,
    }),
  );

  return roomRepository.save(
    roomRepository.create({
      title: params.title,
      type: params.type,
      accessCode: params.accessCode,
      owner,
      canvas,
      expiresAt: null,
      terminationReason: null,
      createdBy: null,
      updatedBy: null,
    }),
  );
}

describe("room integration", () => {
  const suite = setupIntegrationSuite();

  it("allows guest sessions to enter public rooms", async () => {
    const room = await createRoomFixture({
      title: "Public Room",
      type: RoomType.PUBLIC,
      accessCode: "PUBLIC1",
    });
    const agent = suite.agent();

    await agent.post("/auth/guest-session").send({
      nickname: "Guest03",
    });

    const enterResponse = await agent.post(`/rooms/${room.id}/enter-public`).send();

    expect(enterResponse.status).toBe(200);
    expect(enterResponse.body).toEqual({
      room: {
        roomId: room.id,
        type: RoomType.PUBLIC,
      },
    });

    const currentResponse = await agent.get("/rooms/current");

    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body.room).toEqual(
      expect.objectContaining({
        roomId: room.id,
        type: RoomType.PUBLIC,
      }),
    );
  });

  it("blocks guest sessions from creating rooms", async () => {
    const agent = suite.agent();

    await agent.post("/auth/guest-session").send({
      nickname: "Guest04",
    });

    const createResponse = await agent.post("/rooms").send({
      title: "Blocked Room",
      type: RoomType.PUBLIC,
    });

    expect(createResponse.status).toBe(403);
    expect(createResponse.body).toEqual({
      message: "AUTH_MEMBER_ONLY",
    });
  });

  it("blocks guest sessions from entering private rooms by access code", async () => {
    await createRoomFixture({
      title: "Private Room",
      type: RoomType.PRIVATE,
      accessCode: "PRIVATE1",
    });
    const agent = suite.agent();

    await agent.post("/auth/guest-session").send({
      nickname: "Guest05",
    });

    const enterResponse = await agent.post("/rooms/enter").send({
      accessCode: "PRIVATE1",
    });

    expect(enterResponse.status).toBe(403);
    expect(enterResponse.body).toEqual({
      message: "ROOM_PRIVATE_ENTRY_REQUIRES_MEMBER",
    });
  });

  it("resolves public room access codes without authentication", async () => {
    const room = await createRoomFixture({
      title: "Public Resolve Room",
      type: RoomType.PUBLIC,
      accessCode: "PUBLIC2",
    });

    const response = await suite.request().post("/rooms/resolve-access-code").send({
      accessCode: "PUBLIC2",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      room: {
        roomId: room.id,
        type: RoomType.PUBLIC,
        status: "active",
      },
    });
  });

  it("resolves private room access codes without authentication", async () => {
    const room = await createRoomFixture({
      title: "Private Resolve Room",
      type: RoomType.PRIVATE,
      accessCode: "PRIVATE2",
    });

    const response = await suite.request().post("/rooms/resolve-access-code").send({
      accessCode: "PRIVATE2",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      room: {
        roomId: room.id,
        type: RoomType.PRIVATE,
        status: "active",
      },
    });
  });

});
