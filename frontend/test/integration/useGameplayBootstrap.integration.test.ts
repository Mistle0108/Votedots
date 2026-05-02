import { renderHook } from "@testing-library/react";
import { http } from "msw/core/http";
import { useGameplayBootstrap } from "@/features/gameplay/session/hooks/useGameplayBootstrap";
import { getGameConfig } from "@/shared/config/game-config";
import { server } from "../setup/msw/server";

describe("useGameplayBootstrap integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads current canvas, active round state, tickets, and vote status", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-05-02T10:00:00.000Z").getTime(),
    );

    server.use(
      http.get("http://localhost:4000/canvas/current", async () =>
        Response.json({
          canvas: {
            id: 10,
            gridX: 64,
            gridY: 64,
            configProfileKey: "config64",
            resultTemplateAssetKey: "grid-b-64x64",
            status: "playing",
            phase: "round_active",
            phaseStartedAt: "2026-05-02T09:59:40.000Z",
            phaseEndsAt: "2026-05-02T10:00:20.000Z",
            currentRoundNumber: 2,
            startedAt: "2026-05-02T09:00:00.000Z",
            endedAt: null,
          },
          gameConfig: {
            phases: {
              introPhaseSec: 3,
              roundStartWaitSec: 2,
              roundDurationSec: 40,
              roundResultDelaySec: 3,
              gameEndWaitSec: 5,
              restartDelaySec: 5,
            },
            rules: {
              totalRounds: 5,
              votesPerRound: 10,
              participantGracePeriodSec: 15,
            },
            board: {
              gridSizeX: 64,
              gridSizeY: 64,
              cellSize: 30,
            },
          },
        }),
      ),
      http.get("http://localhost:4000/canvas/10/rounds/active", async () =>
        Response.json({
          status: "active",
          canvasPhase: "round_active",
          phaseStartedAt: "2026-05-02T09:59:40.000Z",
          phaseEndsAt: "2026-05-02T10:00:20.000Z",
          round: {
            id: 22,
            roundNumber: 2,
            startedAt: "2026-05-02T09:59:40.000Z",
            endedAt: null,
            roundDurationSec: 40,
            totalRounds: 5,
            gameEndAt: "2026-05-02T10:10:00.000Z",
          },
          timer: {
            remainingSeconds: 20,
            isRoundExpired: false,
            roundDurationSec: 40,
            totalRounds: 5,
            gameEndAt: "2026-05-02T10:10:00.000Z",
          },
        }),
      ),
      http.get(
        "http://localhost:4000/vote/rounds/22/tickets",
        async () => Response.json({ remaining: 7 }),
      ),
      http.get(
        "http://localhost:4000/vote/rounds/22/status",
        async () =>
          Response.json({
            status: {
              "1:1:#111111": 2,
              "1:1:#ffffff": 4,
            },
          }),
      ),
    );

    const { result } = renderHook(() => useGameplayBootstrap());
    const bootstrapResult = await result.current.bootstrap();

    expect(bootstrapResult.canvasId).toBe(10);
    expect(bootstrapResult.gridX).toBe(64);
    expect(bootstrapResult.resultTemplateImageUrl).toBe(
      "/result-templates/64x64/grid-b-64x64.png",
    );
    expect(bootstrapResult.round.roundId).toBe(22);
    expect(bootstrapResult.round.remainingSeconds).toBe(20);
    expect(bootstrapResult.remaining).toBe(7);
    expect(bootstrapResult.votes).toEqual({
      "1:1:#111111": 2,
      "1:1:#ffffff": 4,
    });
    expect(getGameConfig().rules.totalRounds).toBe(5);
  });
});
