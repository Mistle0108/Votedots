import { render, screen } from "@testing-library/react";
import FeaturedPreviewSection from "@/features/landing/components/FeaturedPreviewSection";
import type { LandingFeaturedPreviewItem } from "@/features/landing/model/landing.types";

const labels = {
  title: "Completed canvases",
  description: "Preview cards",
  participants: "Participants",
  votes: "Votes",
  topVoter: "Top voter",
};

function getCardImages() {
  return Array.from(document.querySelectorAll("img"));
}

describe("FeaturedPreviewSection", () => {
  it("always renders four fixed slots with fallback images when preview items are empty", () => {
    render(
      <FeaturedPreviewSection locale="en" items={[]} labels={labels} />,
    );

    expect(
      screen.getByRole("heading", { name: "32 x 32" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "64 x 64" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "128 x 128" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "256 x 256" }),
    ).toBeInTheDocument();

    const images = getCardImages();
    expect(images).toHaveLength(4);
    images.forEach((image) => {
      expect(image.getAttribute("src")).toContain(
        "/landing/fallback/en/featured-preview-fallback.png",
      );
    });

    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("renders webp and preview metadata only for the matching size slot", () => {
    const items: LandingFeaturedPreviewItem[] = [
      {
        webpUrl: "/api/public/landing/previews/1/asset",
        preview: {
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

    render(
      <FeaturedPreviewSection locale="en" items={items} labels={labels} />,
    );

    const images = getCardImages();
    const webpImage = images.find((image) =>
      image.getAttribute("src")?.includes("/api/public/landing/previews/1/asset"),
    );

    expect(webpImage).toBeDefined();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("Alice (50)")).toBeInTheDocument();
  });
});
