import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeaturedPreviewSection from "@/features/landing/components/FeaturedPreviewSection";
import type { LandingFeaturedPreviewItem } from "@/features/landing/model/landing.types";

const labels = {
  title: "Completed canvases",
  description: "Preview cards",
  plaza: "Plaza",
  public: "Public",
  empty: "No completed canvases yet.",
};

describe("FeaturedPreviewSection", () => {
  it("renders plaza and public sections with empty state when items are missing", () => {
    render(
      <FeaturedPreviewSection
        labels={labels}
        actionLabel="View details"
        onOpenDetail={() => {}}
      />,
    );

    expect(screen.getByText("Completed canvases")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plaza" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public" })).toBeInTheDocument();
    expect(screen.getAllByText("No completed canvases yet.")).toHaveLength(2);
  });

  it("renders cards for plaza/public items and forwards detail action", () => {
    const handleOpenDetail = vi.fn();
    const plazaItems: LandingFeaturedPreviewItem[] = [
      {
        webpUrl: "/api/public/landing/previews/1/asset",
        preview: {
          canvasId: 1,
          size: "64x64",
          gridX: 64,
          gridY: 64,
          endedAt: "2026-05-07T07:59:35.417Z",
          participantCount: 5,
          participants: ["Alice", "Bob"],
          topVoter: {
            name: "Alice",
            voteCount: 50,
          },
          totalVotes: 120,
        },
      },
    ];
    const publicItems: LandingFeaturedPreviewItem[] = [
      {
        webpUrl: "/api/public/landing/previews/2/asset",
        preview: {
          canvasId: 2,
          size: "128x128",
          gridX: 128,
          gridY: 128,
          endedAt: "2026-05-08T07:59:35.417Z",
          participantCount: 2,
          participants: ["Chris"],
          topVoter: {
            name: "Chris",
            voteCount: 18,
          },
          totalVotes: 30,
        },
      },
    ];

    render(
      <FeaturedPreviewSection
        plazaItems={plazaItems}
        publicItems={publicItems}
        labels={labels}
        actionLabel="View details"
        onOpenDetail={handleOpenDetail}
      />,
    );

    const images = Array.from(document.querySelectorAll("img"));
    expect(
      images.some((image) =>
        image.getAttribute("src")?.includes("/api/public/landing/previews/1/asset"),
      ),
    ).toBe(true);
    expect(
      images.some((image) =>
        image.getAttribute("src")?.includes("/api/public/landing/previews/2/asset"),
      ),
    ).toBe(true);

    const buttons = screen.getAllByRole("button", { name: "View details" });
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);
    expect(handleOpenDetail).toHaveBeenCalledWith(1);
  });
});
