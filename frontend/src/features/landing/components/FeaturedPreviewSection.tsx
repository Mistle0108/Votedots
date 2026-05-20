import CanvasResultCard from "@/features/canvas-result/components/CanvasResultCard";
import type { LandingFeaturedPreviewItem } from "../model/landing.types";

interface FeaturedPreviewSectionProps {
  plazaItems?: LandingFeaturedPreviewItem[];
  publicItems?: LandingFeaturedPreviewItem[];
  actionLabel: string;
  onOpenDetail: (canvasId: number) => void;
  labels: {
    title: string;
    description: string;
    plaza: string;
    public: string;
    empty: string;
  };
}

function PreviewGroup({
  title,
  items,
  emptyLabel,
  actionLabel,
  onOpenDetail,
}: {
  title: string;
  items: LandingFeaturedPreviewItem[];
  emptyLabel: string;
  actionLabel: string;
  onOpenDetail: (canvasId: number) => void;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-[20px] font-semibold leading-[118%] text-[#272E37]">
        {title}
      </h3>

      {items.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <CanvasResultCard
              key={item.preview.canvasId}
              imageUrl={item.webpUrl}
              imageAlt={`${item.preview.gridX} x ${item.preview.gridY}`}
              emptyMessage={emptyLabel}
              gridX={item.preview.gridX}
              gridY={item.preview.gridY}
              actionLabel={actionLabel}
              onAction={() => onOpenDetail(item.preview.canvasId)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] bg-[#f6ede5] px-6 py-10 text-center text-sm text-[#5f6368]">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export default function FeaturedPreviewSection({
  plazaItems = [],
  publicItems = [],
  actionLabel,
  onOpenDetail,
  labels,
}: FeaturedPreviewSectionProps) {
  return (
    <section className="mx-auto mt-10 max-w-6xl">
      <div className="text-left">
        <div
          className="text-[24px] font-semibold leading-[118%] lg:text-[24px]"
          style={{ color: "#000000" }}
        >
          {labels.title}
        </div>
        <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-7 text-[#5f6368]">
          {labels.description}
        </p>
      </div>

      <div className="mt-8 space-y-10">
        <PreviewGroup
          title={labels.plaza}
          items={plazaItems}
          emptyLabel={labels.empty}
          actionLabel={actionLabel}
          onOpenDetail={onOpenDetail}
        />
        <PreviewGroup
          title={labels.public}
          items={publicItems}
          emptyLabel={labels.empty}
          actionLabel={actionLabel}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </section>
  );
}
