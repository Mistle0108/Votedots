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
  it("keeps the current game panel visible when preview api fails", async () => {
    server.use(
      http.get("http://localhost:3000/api/public/landing", async () =>
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
      http.get("http://localhost:3000/api/public/landing/previews", async () =>
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

    const currentGameImage = document.querySelector<HTMLImageElement>(
      'img[src="/result-templates/32x32/sample-template.png"]',
    );
    expect(currentGameImage).not.toBeNull();
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
  });
});
