import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import LandingPage from "@/pages/landing/LandingPage";
import { server } from "../setup/msw/server";
import { renderWithProviders } from "../setup/render-with-providers";

vi.mock("@/features/auth", () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error("guest")),
  },
}));

describe("LandingPage integration", () => {
  it("keeps the current game panel visible when completed preview api fails", async () => {
    server.use(
      http.get("http://localhost:4000/public/landing", async () =>
        Response.json({
          currentGame: {
            canvasId: 10,
            gridX: 32,
            gridY: 32,
            currentRoundNumber: 1,
            totalRounds: 10,
            participantCount: 3,
            snapshotUrl: null,
            fallbackImageUrl: "/result-templates/32x32/sample-template.png",
          },
          featuredGames: [],
        }),
      ),
      http.get("http://localhost:4000/public/landing/completed", async () =>
        Response.json({ message: "failed" }, { status: 500 }),
      ),
    );

    renderWithProviders(<LandingPage locale="en" />, {
      route: "/en",
      locale: "en",
    });

    await waitFor(() => {
      expect(screen.getByText("Current game")).toBeInTheDocument();
    });

    const currentGameImage = Array.from(
      document.querySelectorAll<HTMLImageElement>("img"),
    ).find((image) =>
      image.src.includes("/result-templates/32x32/sample-template.png"),
    );
    expect(currentGameImage).toBeDefined();
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
  });

  it("renders plaza and public completed preview sections when completed preview api succeeds", async () => {
    server.use(
      http.get("http://localhost:4000/public/landing", async () =>
        Response.json({
          currentGame: null,
          featuredGames: [],
        }),
      ),
      http.get("http://localhost:4000/public/landing/completed", ({ request }) => {
        const url = new URL(request.url);
        const scope = url.searchParams.get("scope");

        if (scope === "plaza") {
          return Response.json({
            items: [
              {
                webpUrl: "/api/public/landing/previews/11/asset",
                preview: {
                  canvasId: 11,
                  size: "64x64",
                  gridX: 64,
                  gridY: 64,
                  endedAt: "2026-05-20T00:00:00.000Z",
                  participantCount: 3,
                  participants: ["Alice", "Bob"],
                  topVoter: { name: "Alice", voteCount: 12 },
                  totalVotes: 20,
                },
              },
            ],
            pagination: {
              page: 1,
              limit: 4,
              totalItems: 1,
              totalPages: 1,
              hasNextPage: false,
            },
          });
        }

        return Response.json({
          items: [
            {
              webpUrl: "/api/public/landing/previews/22/asset",
              preview: {
                canvasId: 22,
                size: "128x128",
                gridX: 128,
                gridY: 128,
                endedAt: "2026-05-19T00:00:00.000Z",
                participantCount: 4,
                participants: ["Chris"],
                topVoter: { name: "Chris", voteCount: 15 },
                totalVotes: 24,
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 4,
            totalItems: 1,
            totalPages: 1,
            hasNextPage: false,
          },
        });
      }),
    );

    renderWithProviders(<LandingPage locale="en" />, {
      route: "/en",
      locale: "en",
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Plaza" })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Public room" })).toBeInTheDocument();
    expect(
      Array.from(document.querySelectorAll<HTMLImageElement>("img")).some((image) =>
        image.src.includes("/api/public/landing/previews/11/asset"),
      ),
    ).toBe(true);
    expect(
      Array.from(document.querySelectorAll<HTMLImageElement>("img")).some((image) =>
        image.src.includes("/api/public/landing/previews/22/asset"),
      ),
    ).toBe(true);
    expect(screen.getAllByRole("button", { name: "View details" })).toHaveLength(2);
  });
});
