import { AppDataSource } from "../../src/database/data-source";
import { Canvas } from "../../src/entities/canvas.entity";
import { setupIntegrationSuite } from "./helpers/setup-integration-suite";

const canvasRepository = AppDataSource.getRepository(Canvas);

async function createPlazaCanvasFixture() {
  return canvasRepository.save(
    canvasRepository.create({
      gridX: 32,
      gridY: 32,
      createdBy: null,
      updatedBy: null,
    }),
  );
}

describe("canvas integration", () => {
  const suite = setupIntegrationSuite();

  it("allows guest reconnect for the same plaza session and blocks new guest sessions from re-entering the same plaza in the same browser", async () => {
    const canvas = await createPlazaCanvasFixture();
    const browserKey = "browser-key-plaza-reentry-01";
    const agent = suite.agent();

    await agent.post("/auth/guest-session").send({
      nickname: "GuestPlaza01",
      browserKey,
    });

    const firstEnterResponse = await agent.post("/canvas/current/enter").send();

    expect(firstEnterResponse.status).toBe(200);
    expect(firstEnterResponse.body).toEqual({
      canvasId: canvas.id,
    });

    const currentResponse = await agent.get("/canvas/current");

    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body.canvas).toEqual(
      expect.objectContaining({
        id: canvas.id,
        gridX: 32,
        gridY: 32,
      }),
    );

    const logoutResponse = await agent.post("/auth/logout").send();

    expect(logoutResponse.status).toBe(200);

    await agent.post("/auth/guest-session").send({
      nickname: "GuestPlaza02",
      browserKey,
    });

    const secondEnterResponse = await agent.post("/canvas/current/enter").send();

    expect(secondEnterResponse.status).toBe(403);
    expect(secondEnterResponse.body).toEqual({
      message: "AUTH_GUEST_REENTRY_BLOCKED",
    });
  });
});
