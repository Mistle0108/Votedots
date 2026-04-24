import { cn } from "@/shared/utils";

const BRAND_LOGO_SOURCES = {
  wordmark: "/brand/logo-wordmark.svg",
  full: "/brand/logo-full.svg",
  symbol: "/brand/logo-symbol.svg",
} as const;

type BrandLogoVariant = keyof typeof BRAND_LOGO_SOURCES;

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  alt?: string;
  className?: string;
}

export function BrandLogo({
  variant = "wordmark",
  alt = "VoteDots",
  className,
}: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGO_SOURCES[variant]}
      alt={alt}
      className={cn("h-auto", className)}
      draggable={false}
      onDragStart={(event) => {
        event.preventDefault();
      }}
    />
  );
}
